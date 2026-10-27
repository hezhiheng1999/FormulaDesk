"""Offline failure-injection tests run in disposable copies, never the live vendor."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

PROJECT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("formuladesk_build", PROJECT / "build.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
check_spec = importlib.util.spec_from_file_location("formuladesk_check", PROJECT / "checks" / "check_bundle.py")
checker = importlib.util.module_from_spec(check_spec)
check_spec.loader.exec_module(checker)


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix=".formuladesk-test-", dir=PROJECT)
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        for folder in ("src", "vendor"):
            shutil.copytree(PROJECT / folder, self.root / folder)
        for name in ("dependency-receipt.json", "package.json", "LICENSE", "THIRD-PARTY-NOTICES.txt"):
            shutil.copyfile(PROJECT / name, self.root / name)
        self.patches = [mock.patch.object(builder, "ROOT", self.root), mock.patch.object(builder, "VENDOR", self.root / "vendor")]
        for patch in self.patches:
            patch.start()
            self.addCleanup(patch.stop)

    def receipt(self, transform):
        path = self.root / "dependency-receipt.json"
        value = json.loads(path.read_text(encoding="utf-8"))
        transform(value)
        path.write_text(json.dumps(value), encoding="utf-8")

    def test_reproducible_output_and_independent_bundle_check(self):
        first = builder.build()
        first_bytes = (self.root / "index.html").read_bytes()
        self.assertEqual(first_bytes, (self.root / "公式输入台.html").read_bytes())
        self.assertEqual(first, builder.build())
        self.assertEqual(checker.check(self.root)["status"], "passed")

    def test_cross_platform_newlines(self):
        original = builder.render()
        css = self.root / "src" / "app.css"
        css.write_bytes(css.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n"))
        self.assertEqual(original, builder.render())

    def test_missing_receipt_entry_is_rejected(self):
        self.receipt(lambda value: value["assets"].pop(0))
        with self.assertRaisesRegex(ValueError, "every required asset"):
            builder.render()

    def test_empty_receipt_is_rejected(self):
        self.receipt(lambda value: value.update(assets=[]))
        with self.assertRaises(ValueError):
            builder.render()

    def test_duplicate_receipt_entry_is_rejected(self):
        self.receipt(lambda value: value["assets"].append(value["assets"][0]))
        with self.assertRaises(ValueError):
            builder.render()

    def test_receipt_identity_is_pinned(self):
        self.receipt(lambda value: value.update(version="0.0.0"))
        with self.assertRaisesRegex(ValueError, "identity"):
            builder.render()

    def test_unsafe_path_is_rejected(self):
        self.receipt(lambda value: value["assets"][0].update(path="../outside.js"))
        with self.assertRaises(ValueError):
            builder.render()

    def test_changed_asset_does_not_replace_existing_html(self):
        builder.build()
        previous = (self.root / "index.html").read_bytes()
        with (self.root / "vendor" / "mathlive.min.js").open("ab") as stream:
            stream.write(b"tampered")
        with self.assertRaisesRegex(ValueError, "Dependency changed"):
            builder.build()
        self.assertEqual(previous, (self.root / "index.html").read_bytes())

    def test_atomic_replace_failure_preserves_existing_html(self):
        output = self.root / "index.html"
        output.write_bytes(b"previous good output")
        with mock.patch.object(builder.os, "replace", side_effect=OSError("simulated write failure")):
            with self.assertRaises(OSError):
                builder.atomic_write(output, b"new output")
        self.assertEqual(output.read_bytes(), b"previous good output")
        self.assertEqual(list(self.root.glob(".formuladesk-*.tmp")), [])

    def test_bad_marker_preserves_existing_html(self):
        builder.build()
        previous = (self.root / "index.html").read_bytes()
        path = self.root / "src" / "template.html"
        path.write_text(path.read_text(encoding="utf-8").replace("<!-- CORE_SCRIPT -->", ""), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "build marker"):
            builder.build()
        self.assertEqual(previous, (self.root / "index.html").read_bytes())

    def test_checker_rejects_external_resource_and_stays_enabled_under_optimization(self):
        builder.build()
        path = self.root / "index.html"
        path.write_bytes(path.read_bytes().replace(b"</head>", b'<script src="https://example.test/x.js"></script></head>'))
        with self.assertRaises(ValueError):
            checker.check(self.root)
        command = "import importlib.util;from pathlib import Path;s=importlib.util.spec_from_file_location('check'," + repr(str(PROJECT / "checks" / "check_bundle.py")) + ");m=importlib.util.module_from_spec(s);s.loader.exec_module(m);m.check(Path(" + repr(str(self.root)) + "))"
        result = subprocess.run([sys.executable, "-O", "-c", command], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("External HTML asset", result.stderr)


if __name__ == "__main__":
    unittest.main()
