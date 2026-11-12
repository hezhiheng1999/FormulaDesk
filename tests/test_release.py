import importlib.util
import io
import json
import hashlib
from pathlib import Path
import unittest
import zipfile
import tempfile
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("formuladesk_release", ROOT / "tools" / "package_release.py")
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    def windows_fixture(self, root):
        files = {name: b"fixture" for name in release.WINDOWS_FILES - {"windows-manifest.json"}}
        files["app/index.html"] = b"verified HTML"
        manifest = {"version": "1.4.0", "sdk": release.SDK_VERSION, "architecture": "x64",
                    "files": {name: hashlib.sha256(data).hexdigest() for name, data in files.items()}}
        files["windows-manifest.json"] = json.dumps(manifest).encode("utf-8")
        for name, data in files.items():
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        bundle = {"sha256": hashlib.sha256(files["app/index.html"]).hexdigest(), "bytes": len(files["app/index.html"])}
        return files, manifest, bundle

    def test_windows_allowlist_omits_runtime_cache_and_rejects_corruption(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            files, _, bundle = self.windows_fixture(root)
            (root / "WebView2Data").mkdir()
            (root / "WebView2Data/cache").write_bytes(b"private runtime cache")
            self.assertEqual(release.windows_sources(root, "1.4.0", bundle), files)
            (root / "FormulaDesk.exe").write_bytes(b"corrupted executable")
            with self.assertRaisesRegex(ValueError, "digest differs"):
                release.windows_sources(root, "1.4.0", bundle)

    def test_windows_release_rejects_mixed_html_and_stale_version(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            _, _, bundle = self.windows_fixture(root)
            with self.assertRaisesRegex(ValueError, "version"):
                release.windows_sources(root, "1.3.0", bundle)
            with self.assertRaisesRegex(ValueError, "HTML differs"):
                release.windows_sources(root, "1.4.0", {"sha256": "a" * 64, "bytes": 13})

    def test_windows_release_rejects_missing_loader_and_unlisted_members(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            _, manifest, bundle = self.windows_fixture(root)
            manifest["files"]["../outside"] = "a" * 64
            (root / "windows-manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "allowlist"):
                release.windows_sources(root, "1.4.0", bundle)
            (root / "runtimes/win-x64/native/WebView2Loader.dll").unlink()
            with self.assertRaises(FileNotFoundError):
                release.windows_sources(root, "1.4.0", bundle)

    def test_public_source_files_rebuild_current_html(self):
        expected = release.builder.render()
        files = {name: expected if name in release.builder.OUTPUT_NAMES else (ROOT / name).read_bytes()
                 for name in release.PUBLIC_FILES}
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            for name, data in files.items():
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
            with mock.patch.object(release.builder, "ROOT", root), mock.patch.object(release.builder, "VENDOR", root / "vendor"):
                self.assertEqual(release.builder.render(), expected)

    def test_stale_verification_cannot_be_packaged(self):
        current = {"sha256": "a" * 64, "bytes": 100}
        recorded = {"version": "1.2.0", "bundle": dict(current)}
        files = {"docs/verification.json": json.dumps(recorded).encode("utf-8")}
        release.validate_verification(files, "1.2.0", current)
        recorded["bundle"]["sha256"] = "b" * 64
        files["docs/verification.json"] = json.dumps(recorded).encode("utf-8")
        with self.assertRaisesRegex(ValueError, "does not match"):
            release.validate_verification(files, "1.2.0", current)

    def test_archive_order_and_metadata_are_deterministic(self):
        files = {"index.html": b"test", "README.md": b"guide"}
        one = release.archive_bytes(files, "FormulaDesk-test")
        two = release.archive_bytes(dict(reversed(list(files.items()))), "FormulaDesk-test")
        self.assertEqual(one, two)
        release.inspect_archive(one, files, "FormulaDesk-test")
        with zipfile.ZipFile(io.BytesIO(one)) as archive:
            self.assertEqual(archive.read("FormulaDesk-test/index.html"), b"test")
            self.assertTrue(all(item.date_time == (2026, 1, 1, 0, 0, 0) for item in archive.infolist()))

    def test_unsafe_archive_paths_are_rejected(self):
        for name in ("../escape", "/absolute", "C:/drive", "dir\\file"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                release.archive_bytes({name: b"test"}, "safe")

    def test_public_allowlist_excludes_local_receipts_and_internal_plans(self):
        self.assertNotIn("checks/verification.json", release.PUBLIC_FILES)
        self.assertNotIn("checks/baseline-open-source-2026-10-27.json", release.PUBLIC_FILES)
        self.assertFalse(any(name.startswith("docs/superpowers/") for name in release.PUBLIC_FILES))
        self.assertTrue(all(not name.startswith("dist/") for name in release.PUBLIC_FILES))

    def test_private_paths_and_token_shapes_are_rejected(self):
        samples = ["C:" + chr(92) + "Users" + chr(92) + "example" + chr(92) + "file.txt", "ghp_" + "x" * 40, "sk-" + "z" * 40]
        for value in samples:
            with self.subTest(value=value[:5]), self.assertRaises(ValueError):
                release.scan_public({"README.md": value.encode("utf-8")})

    def test_missing_local_documentation_link_is_rejected(self):
        with self.assertRaises(ValueError):
            release.validate_links({"README.md": b"[Guide](missing.md)"})

    def test_archive_inspector_rejects_unexpected_members(self):
        archive = release.archive_bytes({"extra.txt": b"test"}, "safe")
        with self.assertRaises(ValueError):
            release.inspect_archive(archive, {"index.html"}, "safe")


if __name__ == "__main__":
    unittest.main()
