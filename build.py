"""Build FormulaDesk offline using only the Python standard library (3.10+)."""

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parent
VENDOR = ROOT / "vendor"
VERSION = "0.111.1"
INTEGRITY = "sha512-RVaC7NO02Lmx3ZNUxOHR2xCRpcvTfBb2BtdgV60cTanAMufaUkWcPPB2VxChcsNeL+0rTQKqOPDYxXLPOXJI+A=="
PACKAGE_URL = f"https://registry.npmjs.org/mathlive/-/mathlive-{VERSION}.tgz"
OUTPUT_NAMES = ("index.html", "公式输入台.html")
FONT_NAMES = {
    "KaTeX_AMS-Regular", "KaTeX_Caligraphic-Bold", "KaTeX_Caligraphic-Regular",
    "KaTeX_Fraktur-Bold", "KaTeX_Fraktur-Regular", "KaTeX_Main-Bold",
    "KaTeX_Main-BoldItalic", "KaTeX_Main-Italic", "KaTeX_Main-Regular",
    "KaTeX_Math-BoldItalic", "KaTeX_Math-Italic", "KaTeX_SansSerif-Bold",
    "KaTeX_SansSerif-Italic", "KaTeX_SansSerif-Regular", "KaTeX_Script-Regular",
    "KaTeX_Size1-Regular", "KaTeX_Size2-Regular", "KaTeX_Size3-Regular",
    "KaTeX_Size4-Regular", "KaTeX_Typewriter-Regular",
}
EXPECTED_ASSETS = {"mathlive.min.js", "mathlive-fonts.css", "LICENSE.txt", "package.json"} | {
    "fonts/" + name + ".woff2" for name in FONT_NAMES
}


def text_file(path):
    return path.read_text(encoding="utf-8-sig")


def atomic_write(path, contents):
    """Replace a complete file only after writing its bytes successfully."""
    if path.parent.resolve() != ROOT or path.is_symlink():
        raise ValueError("Output must be a regular file directly inside the project")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(prefix=".formuladesk-", suffix=".tmp", dir=ROOT, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(contents)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def download_vendor():
    if VENDOR.exists():
        raise FileExistsError("vendor already exists; existing files are preserved")
    with urllib.request.urlopen(PACKAGE_URL, timeout=40) as response:
        archive_bytes = response.read(8 * 1024 * 1024 + 1)
    if len(archive_bytes) > 8 * 1024 * 1024:
        raise ValueError("Dependency archive exceeds the allowed size")
    actual = "sha512-" + base64.b64encode(hashlib.sha512(archive_bytes).digest()).decode("ascii")
    if actual != INTEGRITY:
        raise ValueError("Dependency archive does not match the pinned npm integrity value")

    selected = {}
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as archive:
        for member in archive.getmembers():
            name = PurePosixPath(member.name)
            if not name.parts or name.parts[0] != "package":
                continue
            relative = name.relative_to("package").as_posix()
            if relative not in EXPECTED_ASSETS:
                continue
            if relative in selected or not member.isfile():
                raise ValueError("Duplicate or non-regular required dependency member: " + relative)
            stream = archive.extractfile(member)
            if stream is None:
                raise ValueError("Unreadable required dependency member: " + relative)
            selected[relative] = stream.read()
    if set(selected) != EXPECTED_ASSETS:
        raise ValueError("Required dependency assets are missing")

    with tempfile.TemporaryDirectory(prefix=".vendor-download-", dir=ROOT) as folder:
        staging = Path(folder) / "vendor"
        staging.mkdir()
        for name, contents in selected.items():
            path = staging / Path(*PurePosixPath(name).parts)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(contents)
        receipt = {
            "name": "mathlive", "version": VERSION, "url": PACKAGE_URL, "integrity": INTEGRITY,
            "assets": [{"path": "vendor/" + name, "sha256": hashlib.sha256(selected[name]).hexdigest()} for name in sorted(selected)],
        }
        # A failed final rename leaves no partially populated vendor directory;
        # --fetch-vendor can be retried. The receipt contains only fixed public data.
        atomic_write(ROOT / "dependency-receipt.json", (json.dumps(receipt, indent=2) + "\n").encode("utf-8"))
        os.replace(staging, VENDOR)
    print(f"Verified MathLive {VERSION}: {len(selected)} files")


def verified_assets():
    receipt = json.loads(text_file(ROOT / "dependency-receipt.json"))
    for field, expected in {"name": "mathlive", "version": VERSION, "url": PACKAGE_URL, "integrity": INTEGRITY}.items():
        if receipt.get(field) != expected:
            raise ValueError("Unexpected dependency receipt identity: " + field)
    vendor_root = VENDOR.resolve()
    if not vendor_root.is_relative_to(ROOT):
        raise ValueError("vendor resolves outside this project")
    entries = receipt.get("assets")
    if not isinstance(entries, list):
        raise ValueError("Dependency receipt assets must be a list")
    paths = [entry.get("path") for entry in entries if isinstance(entry, dict)]
    expected_paths = {"vendor/" + name for name in EXPECTED_ASSETS}
    if len(paths) != len(entries) or any(not isinstance(name, str) for name in paths) or len(set(paths)) != len(paths) or set(paths) != expected_paths:
        raise ValueError("Dependency receipt must list every required asset exactly once")

    result = {}
    for entry in entries:
        name = entry["path"]
        digest = entry.get("sha256")
        if not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest):
            raise ValueError("Invalid dependency digest: " + name)
        path = (ROOT / name).resolve()
        if not path.is_relative_to(vendor_root):
            raise ValueError("Dependency path resolves outside vendor: " + name)
        contents = path.read_bytes()
        if hashlib.sha256(contents).hexdigest() != digest:
            raise ValueError("Dependency changed: " + name)
        result[name.removeprefix("vendor/")] = contents
    package = json.loads(result["package.json"].decode("utf-8"))
    if package.get("name") != "mathlive" or package.get("version") != VERSION:
        raise ValueError("Vendored package metadata does not match the pinned release")
    return result


def render():
    assets = verified_assets()
    metadata = json.loads(text_file(ROOT / "package.json"))
    app_version = metadata["version"]
    if not re.fullmatch(r"\d+\.\d+\.\d+", app_version):
        raise ValueError("Application version must be a three-part numeric version")
    fonts_css = assets["mathlive-fonts.css"].decode("utf-8")
    referenced_fonts = set()

    def inline_font(match):
        name = match.group(1).strip("\"'")
        if name not in EXPECTED_ASSETS or not name.startswith("fonts/"):
            raise ValueError("Unexpected font reference: " + name)
        contents = assets[name]
        if not contents.startswith(b"wOF2"):
            raise ValueError("Invalid WOFF2 font: " + name)
        referenced_fonts.add(name)
        return 'url("data:font/woff2;base64,' + base64.b64encode(contents).decode("ascii") + '")'

    fonts_css = re.sub(r"url\(([^)]+)\)", inline_font, fonts_css)
    if referenced_fonts != {name for name in EXPECTED_ASSETS if name.startswith("fonts/")}:
        raise ValueError("Font stylesheet does not reference the complete pinned font set")

    def script(contents):
        escaped = re.sub(r"</script", lambda match: match.group(0).replace("/", "\\/", 1), contents, flags=re.IGNORECASE)
        return "<script>\n" + escaped + "\n</script>"

    notices = text_file(ROOT / "LICENSE") + "\n" + assets["LICENSE.txt"].decode("utf-8") + "\n" + text_file(ROOT / "THIRD-PARTY-NOTICES.txt")
    replacements = {
        "<!-- THIRD_PARTY_LICENSE -->": "<!--\n" + notices + "\n-->",
        "<!-- APP_VERSION -->": app_version,
        "<!-- FONT_STYLES -->": "<style>\n" + fonts_css + "\n</style>",
        "<!-- APP_STYLES -->": "<style>\n" + text_file(ROOT / "src" / "app.css") + "\n</style>",
        "<!-- MATHLIVE_SCRIPT -->": script(assets["mathlive.min.js"].decode("utf-8")),
        "<!-- CORE_SCRIPT -->": script(text_file(ROOT / "src" / "core.js")),
        "<!-- APP_SCRIPT -->": script(text_file(ROOT / "src" / "app.js")),
    }
    result = text_file(ROOT / "src" / "template.html")
    for marker, contents in replacements.items():
        if result.count(marker) != 1:
            raise ValueError("Expected a single build marker: " + marker)
        result = result.replace(marker, contents)
    # Fixed UTF-8 and LF bytes across Windows, macOS and Linux.
    return result.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def build():
    contents = render()
    for name in OUTPUT_NAMES:
        atomic_write(ROOT / name, contents)
    digest = hashlib.sha256(contents).hexdigest()
    print(f"Built FormulaDesk: {len(contents):,} bytes; SHA256 {digest}")
    return {"sha256": digest, "bytes": len(contents)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch-vendor", action="store_true", help="Download the pinned public npm package once; never overwrite vendor")
    args = parser.parse_args()
    if args.fetch_vendor:
        download_vendor()
    build()

