"""Regression checks for the portable Windows build contract."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import os
import subprocess

ROOT = Path(__file__).resolve().parents[1]


class WindowsBuildTests(unittest.TestCase):
    @unittest.skipUnless(os.name == "nt", "Windows compiler test")
    def test_window_height_clamps_switches_and_restores(self):
        compiler = Path(os.environ["WINDIR"]) / "Microsoft.NET/Framework64/v4.0.30319/csc.exe"
        if not compiler.exists():
            self.skipTest(".NET Framework C# compiler is unavailable")
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "Check.cs"
            exe = Path(temporary) / "Check.exe"
            source.write_text('using FormulaDesk; class Check { static int Main() { '
                'return WindowHeight.Calculate(480,200,560,true)==560 && '
                'WindowHeight.Calculate(480,30,560,true)==510 && '
                'WindowHeight.Calculate(480,0,560,false)==480 && '
                'WindowHeight.Calculate(640,0,400,false)==640 ? 0 : 1; }}', encoding="utf-8")
            subprocess.run([str(compiler), "/nologo", "/out:" + str(exe),
                            str(ROOT / "src/windows/WindowHeight.cs"), str(source)], check=True)
            subprocess.run([str(exe)], check=True)

    def test_sdk_validation_rejects_wrong_bytes_before_replacing_output(self):
        spec = importlib.util.spec_from_file_location("windows_builder", ROOT / "tools/build_windows.py")
        builder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(builder)
        with tempfile.TemporaryDirectory() as temporary:
            package = Path(temporary) / "wrong.nupkg"
            package.write_bytes(b"not the pinned SDK")
            with self.assertRaisesRegex(ValueError, "SDK"):
                builder.verified_sdk(package)
