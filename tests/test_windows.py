"""Regression checks for the portable Windows build contract."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import os
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def compile_check(directory, program, sources, references=()):
    compiler = Path(os.environ["WINDIR"]) / "Microsoft.NET/Framework64/v4.0.30319/csc.exe"
    if not compiler.is_file():
        raise unittest.SkipTest(".NET Framework C# compiler is unavailable")
    source = Path(directory) / "Check.cs"
    exe = source.with_suffix(".exe")
    source.write_text(program, encoding="utf-8-sig")
    subprocess.run([str(compiler), "/nologo", "/out:" + str(exe),
                    *["/r:" + name for name in references],
                    *[str(ROOT / "src/windows" / name) for name in sources], str(source)], check=True)
    return exe


class WindowsBuildTests(unittest.TestCase):
    @unittest.skipUnless(os.name == "nt", "Windows worksheet I/O")
    def test_worksheet_format_limits_and_atomic_replacement(self):
        with tempfile.TemporaryDirectory() as directory:
            exe = compile_check(directory, r'''
using System;
using System.IO;
using System.Text;
using FormulaDesk;
class Check {
    static void Reject(Action action) {
        try { action(); } catch (InvalidDataException) { return; }
        throw new Exception("invalid worksheet accepted");
    }
    static void Main(string[] args) {
        string path = Path.Combine(args[0], "test.fdesk.json");
        string latex = " \\\\frac{1}{\r\n$x$ </script> /Date(0)/ ";
        string note = "中文\n𝛼\t\0\r";
        WorksheetStore.WriteAtomic(path, new WorksheetDocument(latex, note));
        var read = WorksheetStore.Read(path);
        if (read.Latex != latex || read.Note != note) throw new Exception("raw text changed");
        string empty = WorksheetStore.Serialize(new WorksheetDocument("", ""));
        var valid = "{\"note\":\"\",\"latex\":\"\",\"version\":1,\"format\":\"formuladesk-worksheet\"}";
        if (WorksheetStore.Deserialize(valid).Latex != "" || WorksheetStore.Deserialize(empty).Note != "")
            throw new Exception("empty document");
        foreach (string bad in new [] { "{}", "null", valid + " x", valid.Replace("1,", "1.0,"),
            valid.Replace("1,", "\"1\","), valid.Replace("1,", "2,"), valid.Replace("1,", "true,"),
            valid.Replace("worksheet", "other"), valid.Replace("\"latex\":\"\"", "\"latex\":null"),
            valid.Replace("\"note\":\"\",", ""), valid.Replace("\"note\":\"\"", "\"note\":\"\\q\""),
            valid.Replace("\"note\":\"\"", "\"note\":\"a\nb\""), valid.Replace("\"note\"", "'note'"),
            valid.Replace("\"note\":\"\"", "\"note\":\"\\u041\0\""),
            valid.Replace("\"note\"", "\"note\":\"duplicate\",\"note\""), valid.Replace("}", ",}"),
            valid.Replace("}", ",\"other\":5}") })
            Reject(() => WorksheetStore.Deserialize(bad));
        var utf8 = new UTF8Encoding(false);
        int fill = 1048576 - utf8.GetByteCount(valid);
        string atLimit = valid.Replace("\"latex\":\"\"", "\"latex\":\"" + new string('x', fill) + "\"");
        File.WriteAllText(path, atLimit, utf8);
        if (WorksheetStore.Read(path).Latex.Length != fill) throw new Exception("exact limit");
        File.AppendAllText(path, " ", utf8);
        Reject(() => WorksheetStore.Read(path));
        File.WriteAllBytes(path, new byte[] { 0xc3, 0x28 });
        Reject(() => WorksheetStore.Read(path));
        var old = new WorksheetDocument("old", "");
        WorksheetStore.WriteAtomic(path, old);
        try { WorksheetStore.WriteAtomic(path, new WorksheetDocument("new", ""), false); throw new Exception("unconfirmed overwrite"); }
        catch (IOException) {}
        Reject(() => WorksheetStore.WriteAtomic(path, new WorksheetDocument(new string('x', 1048576), "")));
        using (File.Open(path, FileMode.Open, FileAccess.Read, FileShare.Read)) {
            try { WorksheetStore.WriteAtomic(path, new WorksheetDocument("new", "")); throw new Exception("lock ignored"); }
            catch (IOException) {}
        }
        if (WorksheetStore.Read(path).Latex != "old" || Directory.GetFiles(args[0], "*.tmp").Length != 0)
            throw new Exception("old target or temporary file");
    }
}''', ["WorksheetStore.cs"])
            subprocess.run([str(exe), directory], check=True)

    @unittest.skipUnless(os.name == "nt", "Windows process coordination")
    def test_single_instance_signals_across_processes_before_listening(self):
        with tempfile.TemporaryDirectory() as directory:
            exe = compile_check(directory, """
using System;
using System.Threading;
using FormulaDesk;
class Check {
    static int Main(string[] args) {
        using (var instance = SingleInstance.Create(args[1])) {
            if (args[0] == "signal") {
                if (instance.IsPrimary) return 1;
                instance.SignalPrimary();
            } else {
                if (!instance.IsPrimary) return 2;
                if (args[0] == "hold") {
                    Console.WriteLine("primary");
                    Console.ReadLine();
                    using (var received = new AutoResetEvent(false)) {
                        instance.StartListening(() => received.Set());
                        if (!received.WaitOne(3000)) return 3;
                    }
                }
            }
        }
        return 0;
    }
}""", ["SingleInstance.cs"])
            with subprocess.Popen([str(exe), "hold", directory], stdin=subprocess.PIPE,
                                  stdout=subprocess.PIPE, text=True) as first:
                try:
                    self.assertEqual(first.stdout.readline().strip(), "primary")
                    subprocess.run([str(exe), "signal", directory.upper() + "/./"], check=True, timeout=5)
                    other = Path(directory) / "other"
                    other.mkdir()
                    subprocess.run([str(exe), "check", str(other)], check=True, timeout=5)
                    first.communicate("\n", timeout=5)
                    self.assertEqual(first.returncode, 0)
                finally:
                    if first.poll() is None:
                        first.kill()
            subprocess.run([str(exe), "check", directory], check=True, timeout=5)

    @unittest.skipUnless(os.name == "nt", "Windows compiler test")
    def test_window_metrics_scale_and_clamp(self):
        with tempfile.TemporaryDirectory() as directory:
            exe = compile_check(directory, """
using System.Drawing;
using FormulaDesk;
class Check {
    static int Main() {
        if (WindowMetrics.Scale(40, 96) != 40 || WindowMetrics.Scale(40, 120) != 50 ||
            WindowMetrics.Scale(40, 144) != 60 || WindowMetrics.Scale(3, 120) != 4) return 1;
        var left = new Rectangle(-1600, -120, 1600, 900);
        if (WindowMetrics.Clamp(new Rectangle(-1920, 700, 600, 500), left)
                != new Rectangle(-1600, 280, 600, 500)) return 2;
        if (WindowMetrics.Clamp(new Rectangle(-800, 0, 600, 500), left)
                != new Rectangle(-800, 0, 600, 500)) return 3;
        var smaller = new Rectangle(100, 40, 375, 180);
        if (WindowMetrics.Clamp(new Rectangle(800, 320, 600, 500), smaller) != smaller) return 4;
        if (WindowMetrics.Maximized(new Rectangle(-1600, -120, 1600, 900),
                new Rectangle(-1560, -100, 1560, 880)) != new Rectangle(40, 20, 1560, 880)) return 5;
        return 0;
    }
}""", ["WindowMetrics.cs"], ["System.Drawing.dll"])
            subprocess.run([str(exe)], check=True)

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
