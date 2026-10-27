"""Independently inspect generated HTML; checks also run under python -O."""
import base64
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


class BundleParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.resources = []
        self.policy = ""
        self.inline_scripts = 0
        self.ids = []
        self.labels = []
        self.styles = []
        self.in_style = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "label" and "for" in attrs:
            self.labels.append(attrs["for"])
        if tag == "meta" and attrs.get("http-equiv", "").lower() == "content-security-policy":
            self.policy = attrs["content"]
        if tag == "script" and "src" not in attrs:
            self.inline_scripts += 1
        if tag == "style":
            self.in_style = True
        for name in ("src", "srcset"):
            if name in attrs:
                self.resources.append(attrs[name])
        if tag == "link" and "href" in attrs:
            self.resources.append(attrs["href"])

    def handle_endtag(self, tag):
        if tag == "style":
            self.in_style = False

    def handle_data(self, data):
        if self.in_style:
            self.styles.append(data)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check(root=ROOT):
    page = root / "index.html"
    raw = page.read_bytes()
    require(not raw.startswith(b"\xef\xbb\xbf") and b"\r" not in raw, "Expected UTF-8 without BOM and LF newlines")
    contents = raw.decode("utf-8")
    parser = BundleParser()
    parser.feed(contents)
    require(parser.inline_scripts == 3, "Expected vendor, core and application inline scripts")
    require(all(url.startswith("data:") for url in parser.resources), "External HTML asset reference")
    directives = {}
    for directive in parser.policy.split(";"):
        tokens = directive.split()
        if tokens:
            require(tokens[0] not in directives, "Duplicate CSP directive")
            directives[tokens[0]] = tokens[1:]
    for key, values in {"default-src": ["'none'"], "connect-src": ["'none'"], "form-action": ["'none'"], "font-src": ["data:"], "object-src": ["'none'"]}.items():
        require(directives.get(key) == values, "Unexpected content policy: " + key)
    urls = re.findall(r"url\(([^)]+)\)", "\n".join(parser.styles))
    require(all(url.strip("\"'").startswith("data:") for url in urls), "External stylesheet resource")
    fonts = re.findall(r'url\("data:font/woff2;base64,([A-Za-z0-9+/=]+)"\)', contents)
    require(len(fonts) == 20, "Expected 20 embedded fonts")
    require(all(base64.b64decode(font, validate=True).startswith(b"wOF2") for font in fonts), "Invalid embedded WOFF2")
    require(len(set(parser.ids)) == len(parser.ids), "Duplicate DOM IDs")
    require(set(parser.labels).issubset(set(parser.ids)), "Label references a missing control")
    for license_text in ["Copyright (c) 2026 FormulaDesk contributors", "Copyright (c) 2013-2020 Khan Academy", "Copyright (c) 2017 - present Arno Gourdol"]:
        require(license_text in contents, "Missing license text")
    for marker in ["<!-- APP_SCRIPT -->", "<!-- CORE_SCRIPT -->", "<!-- APP_VERSION -->"]:
        require(marker not in contents, "Unprocessed build marker")
    alias = root / "公式输入台.html"
    if alias.exists():
        require(alias.read_bytes() == raw, "Legacy filename differs from index.html")
    for name in ("公式输入台.cmd", "open-formuladesk.cmd"):
        if (root / name).exists():
            require((root / name).read_bytes().isascii(), "Launcher depends on a Windows code page")
    return {"artifact": "index.html", "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw), "embedded_fonts": len(fonts), "external_html_assets": 0, "status": "passed"}


if __name__ == "__main__":
    print(json.dumps(check(), indent=2))

