"""Build the portable Windows x64 app using the pinned, local WebView2 SDK."""
import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import build as web_build

SDK_VERSION = "1.0.4314.35"
SDK_HASH = "cOaiVqP3BmQHMnxGpZzANM22tUXgycrisyJHjIGNzIaMsm8iXj7Kx+ceYg+RbYwJtzT009qfcFTocvVLY+ekMw=="
SDK_FILES = {
    "lib/net462/Microsoft.Web.WebView2.Core.dll": "Microsoft.Web.WebView2.Core.dll",
    "lib/net462/Microsoft.Web.WebView2.WinForms.dll": "Microsoft.Web.WebView2.WinForms.dll",
    "runtimes/win-x64/native/WebView2Loader.dll": "runtimes/win-x64/native/WebView2Loader.dll",
    "LICENSE.txt": "licenses/WebView2-LICENSE.txt",
    "NOTICE.txt": "licenses/WebView2-NOTICE.txt",
}


def verified_sdk(path):
    data = Path(path).read_bytes()
    if base64.b64encode(hashlib.sha512(data).digest()).decode("ascii") != SDK_HASH:
        raise ValueError("WebView2 SDK SHA-512 differs from the pinned official package")
    with zipfile.ZipFile(io.BytesIO(data)) as package:
        return {target: package.read(source) for source, target in SDK_FILES.items()}


def build_windows(sdk_package, output):
    sdk = verified_sdk(sdk_package)
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    compiler = Path(os.environ["WINDIR"]) / "Microsoft.NET/Framework64/v4.0.30319/csc.exe"
    if not compiler.is_file():
        raise FileNotFoundError("The .NET Framework x64 C# compiler is required for this build")
    web_build.build()
    output = output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    destination = output / "FormulaDesk"
    if destination.is_symlink():
        raise ValueError("Windows destination must be a regular directory")
    with tempfile.TemporaryDirectory(prefix=".windows-build-", dir=output) as temporary:
        stage = Path(temporary) / "FormulaDesk"
        stage.mkdir()
        for name, data in sdk.items():
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        (stage / "app").mkdir()
        shutil.copyfile(ROOT / "index.html", stage / "app/index.html")
        for name in ("LICENSE", "THIRD-PARTY-NOTICES.txt"):
            shutil.copyfile(ROOT / name, stage / name)
        (stage / "使用说明.txt").write_text(
            "FormulaDesk " + version + " Windows x64 便携版\n"
            "完整解压到可写文件夹后，双击 FormulaDesk.exe。\n"
            "需要 Windows 10/11 x64、.NET Framework 4.8 系列和系统 WebView2 Runtime。\n"
            "标题栏图钉位于最小化按钮左侧，蓝色直立表示置顶开启，灰色倾斜表示关闭。\n"
            "点击下方标签展开内容，再点同一标签收起。复制后点回目标输入框粘贴。\n"
            "输入只在本次窗口中保留，关闭前请复制。运行时缓存位于 WebView2Data 文件夹。\n"
            "备用网页入口为 app/index.html。退出程序后可删除整个解压目录。\n",
            encoding="utf-8")
        shutil.copyfile(ROOT / "src/windows/app.config", stage / "FormulaDesk.exe.config")
        icon_tool = Path(temporary) / "CreateIcon.exe"
        icon_file = Path(temporary) / "app.ico"
        subprocess.run([str(compiler), "/nologo", "/r:System.Drawing.dll", "/out:" + str(icon_tool),
                        str(ROOT / "src/windows/CreateIcon.cs")], check=True)
        subprocess.run([str(icon_tool), str(icon_file)], check=True)
        metadata = Path(temporary) / "AssemblyInfo.cs"
        metadata.write_text('using System.Reflection;\n'
            '[assembly: AssemblyTitle("FormulaDesk")]\n'
            '[assembly: AssemblyProduct("FormulaDesk")]\n'
            '[assembly: AssemblyVersion("' + version + '.0")]\n'
            '[assembly: AssemblyFileVersion("' + version + '.0")]\n', encoding="utf-8")
        command = [str(compiler), "/nologo", "/target:winexe", "/platform:x64",
                   "/win32icon:" + str(icon_file),
                   "/win32manifest:" + str(ROOT / "src/windows/app.manifest"),
                   "/out:" + str(stage / "FormulaDesk.exe"),
                   "/r:System.Windows.Forms.dll", "/r:System.Drawing.dll",
                   "/r:System.Web.Extensions.dll"]
        command += ["/r:" + str(stage / name) for name in
                    ("Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll")]
        command += [str(ROOT / "src/windows" / name) for name in ("Program.cs", "WindowHeight.cs", "PinToggle.cs")]
        command.append(str(metadata))
        subprocess.run(command, check=True)
        receipt = {"version": version, "sdk": SDK_VERSION, "architecture": "x64", "files": {}}
        for path in sorted(stage.rglob("*")):
            if path.is_file():
                receipt["files"][path.relative_to(stage).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
        (stage / "windows-manifest.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        archive = Path(temporary) / "windows.zip"
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
            for path in sorted(stage.rglob("*")):
                if path.is_file():
                    package.write(path, "FormulaDesk/" + path.relative_to(stage).as_posix())
        backup = Path(temporary) / "previous"
        if destination.exists():
            destination.rename(backup)
        try:
            stage.rename(destination)
        except OSError:
            if backup.exists():
                backup.rename(destination)
            raise
        final_zip = output / ("formuladesk-" + version + "-win-x64.zip")
        os.replace(archive, final_zip)
    print("EXE", destination / "FormulaDesk.exe")
    print("ZIP", final_zip)
    print("ZIP SHA256", hashlib.sha256(final_zip.read_bytes()).hexdigest())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sdk-package", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build_windows(args.sdk_package, args.output)
