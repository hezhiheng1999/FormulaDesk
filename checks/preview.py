"""Temporary loopback-only preview. Use --fixtures for isolated failure scenarios."""
import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
import re

PAGE_PATH = Path(__file__).resolve().parents[1] / "index.html"
FIXTURES = {"/clipboard-denied.html", "/delayed-copy.html", "/no-renderer.html", "/narrow-frame.html", "/gesture-test.html"}

DELAYED_COPY = """<script>
document.addEventListener("click", function(event) {
  const target = event.target.closest("button");
  if (!target || !["copy-prompt", "copy-latex"].includes(target.id)) return;
  Object.defineProperty(navigator, "clipboard", {configurable:true, value:{
    writeText: function(text) {
      document.getElementById("fixture-captured-copy").value = text;
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
  const label = document.createElement("label");
  label.htmlFor = "fixture-captured-copy";
  label.textContent = "测试夹具：捕获复制参数（不写入系统剪贴板）";
  document.body.appendChild(label);
  const captured = document.createElement("textarea");
  captured.id = "fixture-captured-copy";
  captured.readOnly = true;
  document.body.appendChild(captured);
});
</script>"""

GESTURE_TEST = r"""<script>
window.addEventListener("DOMContentLoaded", function() {
  const button = document.createElement("button");
  button.textContent = "测试夹具：按住并模拟拖选 ∌";
  button.style.cssText = "position:fixed;top:10px;right:10px;z-index:10000";
  document.body.appendChild(button);
  const result = document.createElement("pre");
  result.id = "fixture-gesture-result";
  result.textContent = "等待指针事件测试";
  document.body.appendChild(result);
  button.addEventListener("pointerdown", async function(event) {
    event.preventDefault();
    result.textContent = "正在测试长按拖选";
    const field = document.getElementById("formula");
    field.focus();
    const cap = Array.from(document.querySelectorAll(".MLK__keycap")).find(function(item) {
      return item.getAttribute("aria-label") === "\\ni" && item.getBoundingClientRect().height > 0;
    });
    if (!cap) {
      result.textContent = "失败：请先展开符号键盘";
      throw new Error(result.textContent);
    }
    const before = document.getElementById("latex-source").value;
    function pointer(type, target) {
      const rect = target.getBoundingClientRect();
      target.dispatchEvent(new PointerEvent(type, {
        bubbles: type !== "pointerenter" && type !== "pointerleave", cancelable: true,
        button: 0, buttons: type === "pointerup" ? 0 : 1,
        pointerId: event.pointerId, pointerType: "mouse", isPrimary: true,
        clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2
      }));
    }
    pointer("pointerdown", cap);
    await new Promise(function(resolve) { setTimeout(resolve, 600); });
    const panel = document.querySelector(".MLK__variant-panel.is-visible");
    const choice = panel && panel.querySelectorAll(".item")[1];
    if (!choice) {
      result.textContent = "失败：长按后没有两项变体菜单";
      throw new Error(result.textContent);
    }
    const menuItems = panel.querySelectorAll(".item").length;
    pointer("pointerleave", cap);
    pointer("pointerenter", choice);
    pointer("pointermove", choice);
    pointer("pointerup", choice);
    await new Promise(function(resolve) { setTimeout(resolve, 50); });
    result.textContent = JSON.stringify({
      completed: true, before: before, menuItems: menuItems,
      source: document.getElementById("latex-source").value,
      remainingMenus: document.querySelectorAll(".MLK__variant-panel.is-visible").length
    });
  });
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
        elif self.path == "/gesture-test.html":
            last_script = text.rfind("<script>")
            text = text[:last_script] + GESTURE_TEST + text[last_script:]
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

