"""Temporary loopback-only preview. Use --fixtures for isolated failure scenarios."""
import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
import re

PAGE_PATH = Path(__file__).resolve().parents[1] / "index.html"
FIXTURES = {"/clipboard-denied.html", "/delayed-copy.html", "/no-renderer.html", "/narrow-frame.html"}

DELAYED_COPY = """<script>
document.addEventListener("click", function(event) {
  const target = event.target.closest("button");
  if (!target || !["copy-prompt", "copy-latex"].includes(target.id)) return;
  Object.defineProperty(navigator, "clipboard", {configurable:true, value:{
    writeText: function() {
      document.getElementById("fixture-status").textContent = "模拟复制请求正在等待";
      return new Promise(function(resolve) {
        window.addEventListener("fixture-finish-copy", resolve, {once:true});
      });
    }
  }});
}, {capture:true});
window.addEventListener("DOMContentLoaded", function() {
  const button = document.createElement("button");
  button.id = "fixture-finish-copy";
  button.textContent = "完成测试复制请求";
  button.addEventListener("click", function() { window.dispatchEvent(new Event("fixture-finish-copy")); });
  document.body.appendChild(button);
  const status = document.createElement("p");
  status.id = "fixture-status";
  status.textContent = "模拟复制请求尚未开始";
  document.body.appendChild(status);
});
</script>"""


class Preview(BaseHTTPRequestHandler):
    def do_GET(self):
        allowed = {"/", "/formula.html", "/index.html"}
        if self.server.fixtures:
            allowed |= FIXTURES
        if self.path not in allowed:
            self.send_error(404)
            return
        text = PAGE_PATH.read_text(encoding="utf-8")
        if self.path == "/narrow-frame.html":
            text = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>520px 响应式测试</title><body style="margin:0"><iframe id="narrow-frame" title="520px 公式工具测试" src="/formula.html" style="width:520px;height:800px;border:0"></iframe></body></html>'
        if self.path == "/no-renderer.html":
            scripts = list(re.finditer(r"<script>[\s\S]*?</script>", text))
            if len(scripts) != 3:
                raise ValueError("Unexpected bundle structure for the renderer failure fixture")
            text = text[:scripts[0].start()] + text[scripts[0].end():]
        elif self.path == "/delayed-copy.html":
            last_script = text.rfind("<script>")
            text = text[:last_script] + DELAYED_COPY + text[last_script:]
        page = text.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(page)))
        self.send_header("Cache-Control", "no-store")
        if self.path == "/clipboard-denied.html":
            self.send_header("Permissions-Policy", "clipboard-write=()")
        self.end_headers()
        self.wfile.write(page)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixtures", action="store_true")
    args = parser.parse_args()
    server = HTTPServer(("127.0.0.1", 0), Preview)
    server.fixtures = args.fixtures
    print(json.dumps({"url": f"http://127.0.0.1:{server.server_port}/formula.html", "pid": os.getpid(), "fixtures": args.fixtures}), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Preview stopped", flush=True)
    finally:
        server.server_close()

