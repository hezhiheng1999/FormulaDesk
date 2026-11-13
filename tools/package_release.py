"""Create portable/source release ZIPs from explicit public file allowlists."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path, PurePosixPath
import re
import sys
import os
import tempfile
import urllib.parse
import zipfile
import argparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import build as builder
from tools.build_windows import SDK_FILES, SDK_VERSION

spec = importlib.util.spec_from_file_location("formuladesk_bundle_check", ROOT / "checks" / "check_bundle.py")
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)

PUBLIC_FILES = {
    "AGENTS.md", "docs/project-context.md", "docs/tasks.md", "docs/fd-003-plan.md",
    "README.md", "README.en.md", "LICENSE", "THIRD-PARTY-NOTICES.txt", "CHANGELOG.md", "CONTRIBUTING.md", "SECURITY.md",
    ".gitignore", ".gitattributes", "package.json", "dependency-receipt.json", "build.py", "index.html", "公式输入台.html",
    "open-formuladesk.cmd", "公式输入台.cmd",
    "src/core.js", "src/app.js", "src/desktop.js", "src/examples.js", "src/template.html", "src/app.css",
    "src/windows/Program.cs", "src/windows/WindowHeight.cs", "src/windows/app.manifest", "src/windows/app.config",
    "src/windows/CreateIcon.cs", "src/windows/PinToggle.cs", "src/windows/WindowMetrics.cs",
    "src/windows/SingleInstance.cs", "src/windows/WorksheetStore.cs",
    "tools/build_windows.py", "tests/test_windows.py", "tests/desktop.test.js",
    "checks/check_bundle.py", "checks/preview.py",
    "tests/core.test.js", "tests/examples.test.js", "tests/test_build.py", "tests/test_release.py",
    "tools/package_release.py",
    "docs/QUICKSTART.md", "docs/compatibility.md", "docs/development.md", "docs/releasing.md", "docs/testing.md", "docs/verification.json", "docs/images/preview.png", "docs/images/windows.jpg",
    ".github/workflows/ci.yml", ".github/ISSUE_TEMPLATE/bug_report.md", ".github/ISSUE_TEMPLATE/feature_request.md",
} | {"vendor/" + name for name in builder.EXPECTED_ASSETS}

PORTABLE_FILES = {"index.html", "open-formuladesk.cmd", "LICENSE", "THIRD-PARTY-NOTICES.txt"}
TEXT_SUFFIXES = {".md", ".txt", ".js", ".css", ".html", ".py", ".json", ".yml", ".cmd", ".cs", ".config", ".manifest"}
WINDOWS_FILES = set(SDK_FILES.values()) | {
    "FormulaDesk.exe", "FormulaDesk.exe.config", "app/index.html", "LICENSE",
    "THIRD-PARTY-NOTICES.txt", "使用说明.txt", "windows-manifest.json",
}
SENSITIVE_PATTERNS = [
    re.compile(r"[A-Za-z]:[\\/](?:Users|CodexProject|Ananconda)[\\/][A-Za-z0-9_.\u4e00-\u9fff-]+"),
    re.compile(r"/Users/[A-Za-z0-9_.-]+/"),
    re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"sk-(?:proj-)?[A-Za-z0-9_-]{20,}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
]


def safe_name(name):
    path = PurePosixPath(name)
    if not name or not path.parts or "\\" in name or path.is_absolute() or ".." in path.parts or ":" in path.parts[0]:
        raise ValueError("Unsafe release path: " + name)


def scan_public(files):
    for name, contents in files.items():
        safe_name(name)
        if PurePosixPath(name).suffix not in TEXT_SUFFIXES and PurePosixPath(name).name not in {"LICENSE", ".gitignore", ".gitattributes"}:
            continue
        text = contents.decode("utf-8-sig")
        for pattern in SENSITIVE_PATTERNS:
            if pattern.search(text):
                raise ValueError("Potential private path or credential pattern in public file: " + name)


def validate_links(files):
    for name, contents in files.items():
        if not name.endswith(".md"):
            continue
        text = contents.decode("utf-8-sig")
        for target in re.findall(r"!?\[[^\]]*\]\(([^)]+)\)", text):
            if target.startswith(("https://", "http://", "#", "mailto:")):
                continue
            target = urllib.parse.unquote(target.split("#", 1)[0])
            candidate = PurePosixPath(name).parent / target
            # Resolve '..' lexically inside a virtual archive, never the host FS.
            parts = []
            for part in candidate.parts:
                if part == "..":
                    if not parts:
                        raise ValueError("Documentation link leaves the public project: " + name)
                    parts.pop()
                elif part != ".":
                    parts.append(part)
            if "/".join(parts) not in files:
                raise ValueError("Broken local documentation link in " + name + ": " + target)


def public_sources():
    result = {}
    for name in sorted(PUBLIC_FILES):
        path = ROOT / name
        if path.is_symlink() or not path.resolve().is_relative_to(ROOT):
            raise ValueError("Public file resolves outside project: " + name)
        contents = path.read_bytes()
        if not name.startswith("vendor/") and (path.suffix in TEXT_SUFFIXES or path.name in {"LICENSE", ".gitignore", ".gitattributes"}):
            text = contents.decode("utf-8-sig").replace("\r\n", "\n").replace("\r", "\n")
            if path.suffix == ".cmd":
                text = text.replace("\n", "\r\n")
            contents = text.encode("utf-8")
        result[name] = contents
    scan_public(result)
    validate_links(result)
    return result


def validate_verification(files, version, bundle):
    report = json.loads(files["docs/verification.json"].decode("utf-8"))
    recorded_bundle = report.get("bundle") if isinstance(report, dict) else None
    if not isinstance(recorded_bundle, dict) or report.get("version") != version or recorded_bundle.get("sha256") != bundle["sha256"] or recorded_bundle.get("bytes") != bundle["bytes"]:
        raise ValueError("Verification report does not match the current version and HTML; verify this build and update docs/verification.json before packaging")


def archive_bytes(files, prefix):
    safe_name(prefix)
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in sorted(files):
            safe_name(name)
            info = zipfile.ZipInfo(prefix + "/" + name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, files[name], compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return output.getvalue()


def inspect_archive(contents, expected_names, prefix):
    with zipfile.ZipFile(io.BytesIO(contents)) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or set(names) != {prefix + "/" + name for name in expected_names}:
            raise ValueError("Release ZIP does not match its allowlist")
        for name in names:
            safe_name(name)
        if archive.testzip() is not None:
            raise ValueError("Release ZIP CRC validation failed")


def write_release_file(path, contents):
    if path.parent.resolve() != (ROOT / "dist").resolve() or path.is_symlink():
        raise ValueError("Release output is outside dist or is a symlink")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(prefix=".release-", suffix=".tmp", dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(contents)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def windows_sources(directory, version, bundle):
    directory = Path(directory)
    files = {}
    for name in sorted(WINDOWS_FILES):
        path = directory / name
        if path.is_symlink() or not path.resolve().is_relative_to(directory.resolve()):
            raise ValueError("Windows file leaves its directory: " + name)
        files[name] = path.read_bytes()
    manifest = json.loads(files["windows-manifest.json"])
    if manifest.get("version") != version or manifest.get("sdk") != SDK_VERSION or manifest.get("architecture") != "x64":
        raise ValueError("Windows manifest version, SDK or architecture differs")
    if set(manifest.get("files", {})) != WINDOWS_FILES - {"windows-manifest.json"}:
        raise ValueError("Windows manifest differs from the allowlist")
    for name, digest in manifest["files"].items():
        if hashlib.sha256(files[name]).hexdigest() != digest:
            raise ValueError("Windows manifest digest differs: " + name)
    html = files["app/index.html"]
    if hashlib.sha256(html).hexdigest() != bundle["sha256"] or len(html) != bundle["bytes"]:
        raise ValueError("Windows HTML differs from the verified bundle")
    scan_public(files)
    return files


def package(windows_directory=None):
    builder.build()
    bundle = checker.check(ROOT)
    files = public_sources()
    version = json.loads(files["package.json"].decode("utf-8"))["version"]
    validate_verification(files, version, bundle)
    prefix = "FormulaDesk-" + version
    portable = {name: files[name] for name in PORTABLE_FILES}
    portable["README.md"] = files["docs/QUICKSTART.md"]
    scan_public(portable)
    releases = {
        "formuladesk-" + version + "-portable.zip": (portable, archive_bytes(portable, prefix)),
        "formuladesk-" + version + "-source.zip": (files, archive_bytes(files, prefix)),
    }
    assets = {}
    if windows_directory is not None:
        windows = windows_sources(windows_directory, version, bundle)
        windows_name = "formuladesk-" + version + "-win-x64.zip"
        releases[windows_name] = (windows, archive_bytes(windows, prefix))
        assets["FormulaDesk.exe"] = windows["FormulaDesk.exe"]
    destination = ROOT / "dist"
    if destination.is_symlink() or not destination.resolve().is_relative_to(ROOT):
        raise ValueError("dist resolves outside the project")
    destination.mkdir(exist_ok=True)
    report = {"version": version, "bundle": bundle, "archives": [], "assets": []}
    sums = []
    for name, (members, contents) in sorted(releases.items()):
        inspect_archive(contents, members, prefix)
        digest = hashlib.sha256(contents).hexdigest()
        write_release_file(destination / name, contents)
        report["archives"].append({"file": name, "sha256": digest, "bytes": len(contents), "members": sorted(members)})
        sums.append(digest + "  " + name)
    for name, contents in sorted(assets.items()):
        digest = hashlib.sha256(contents).hexdigest()
        write_release_file(destination / name, contents)
        report["assets"].append({"file": name, "sha256": digest, "bytes": len(contents)})
        sums.append(digest + "  " + name)
    write_release_file(destination / "SHA256SUMS.txt", ("\n".join(sums) + "\n").encode("utf-8"))
    write_release_file(destination / "release-report.json", (json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(json.dumps({"version": version, "archives": [{key: item[key] for key in ("file", "sha256", "bytes")} for item in report["archives"]]}, indent=2))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--windows-dir", type=Path, help="Validated Windows build directory containing FormulaDesk.exe")
    package(parser.parse_args().windows_dir)
