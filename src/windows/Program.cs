using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace FormulaDesk
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new DeskWindow());
        }
    }

    sealed class DeskWindow : Form
    {
        const string Page = "https://formuladesk.example/index.html";
        const int PinCommand = 0x1F10;
        readonly WebView2 web = new WebView2();
        readonly JavaScriptSerializer json = new JavaScriptSerializer();
        readonly PinToggle pin = new PinToggle();
        readonly Panel caption = new Panel();
        readonly ToolTip hints = new ToolTip();
        bool dirty;
        bool ready;
        bool sized;
        bool expanded;
        int collapsedHeight;
        int naturalBase;
        Rectangle normalBounds;
        bool minimizedFromNormal;
        bool minimized;

        public DeskWindow()
        {
            Text = "FormulaDesk";
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            FormBorderStyle = FormBorderStyle.None;
            // A narrow exposed edge keeps native resizing available beside WebView2.
            Padding = new Padding(3);
            BackColor = Color.FromArgb(243, 244, 246);
            AutoScaleMode = AutoScaleMode.None;
            Size = new Size(560, 560);
            MinimumSize = new Size(400, 220);
            StartPosition = FormStartPosition.Manual;
            var area = Screen.PrimaryScreen.WorkingArea;
            Location = new Point(Math.Max(area.Left, area.Right - Width - 30), area.Top + 30);
            TopMost = true;
            web.Dock = DockStyle.Fill;
            Controls.Add(web);
            BuildCaption();
            Shown += async (sender, args) => await Initialize();
            FormClosing += ConfirmClose;
        }

        protected override CreateParams CreateParams
        {
            get
            {
                var parameters = base.CreateParams;
                // Retain DWM frame styles; WM_NCCALCSIZE removes the system caption.
                parameters.Style |= 0x00C00000 | 0x40000 | 0x20000 | 0x10000 | 0x80000;
                return parameters;
            }
        }

        void BuildCaption()
        {
            caption.Height = Math.Max(32, SystemInformation.CaptionHeight + 8);
            caption.Dock = DockStyle.Top;
            caption.BackColor = BackColor;
            var title = new Label { Text = "FormulaDesk", AutoSize = false, Dock = DockStyle.Fill,
                TextAlign = ContentAlignment.MiddleLeft, Padding = new Padding(34, 0, 0, 0),
                Font = SystemFonts.MessageBoxFont };
            var logo = new PictureBox { Image = Icon.ToBitmap(), SizeMode = PictureBoxSizeMode.Zoom,
                Size = new Size(18, 18), Location = new Point(9, (caption.Height - 18) / 2) };
            var actions = new FlowLayoutPanel { Dock = DockStyle.Right, Width = 160,
                WrapContents = false, Margin = Padding.Empty, Padding = Padding.Empty };
            pin.Size = new Size(40, caption.Height);
            pin.CheckedChanged += (sender, e) => { TopMost = pin.Checked; UpdatePin(); };
            actions.Controls.Add(pin);
            actions.Controls.Add(CaptionButton("−", "最小化", Minimize));
            actions.Controls.Add(CaptionButton("□", "最大化或还原", ToggleMaximize));
            actions.Controls.Add(CaptionButton("×", "关闭", Close));
            caption.Controls.Add(title);
            caption.Controls.Add(logo);
            caption.Controls.Add(actions);
            logo.BringToFront();
            Controls.Add(caption);
            web.BringToFront();
            MouseEventHandler drag = (sender, e) => {
                if (e.Button != MouseButtons.Left) return;
                ReleaseCapture();
                SendMessage(Handle, 0xA1, (IntPtr)2, IntPtr.Zero);
            };
            title.MouseDown += drag;
            logo.MouseDown += drag;
            MouseEventHandler menu = (sender, e) => {
                if (e.Button != MouseButtons.Right) return;
                Point point = ((Control)sender).PointToScreen(e.Location);
                uint command = TrackPopupMenu(GetSystemMenu(Handle, false), 0x102,
                    point.X, point.Y, 0, Handle, IntPtr.Zero);
                if (command != 0) SendMessage(Handle, 0x112, (IntPtr)command, IntPtr.Zero);
            };
            title.MouseUp += menu;
            logo.MouseUp += menu;
            title.DoubleClick += (sender, e) => ToggleMaximize();
            UpdatePin();
        }

        Button CaptionButton(string text, string label, Action click)
        {
            var button = new Button { Text = text, AccessibleName = label, FlatStyle = FlatStyle.Flat,
                Size = new Size(40, caption.Height), Margin = Padding.Empty, TabStop = true,
                Font = new Font("Segoe UI", 13), BackColor = caption.BackColor };
            button.FlatAppearance.BorderSize = 0;
            hints.SetToolTip(button, label);
            button.Click += (sender, e) => click();
            return button;
        }

        void ToggleMaximize()
        {
            if (WindowState == FormWindowState.Maximized)
            {
                WindowState = FormWindowState.Normal;
                if (!normalBounds.IsEmpty) Bounds = normalBounds;
                return;
            }
            if (WindowState == FormWindowState.Normal) normalBounds = Bounds;
            MaximizedBounds = Screen.FromControl(this).WorkingArea;
            WindowState = FormWindowState.Maximized;
        }

        void Minimize()
        {
            minimizedFromNormal = WindowState == FormWindowState.Normal;
            if (minimizedFromNormal) normalBounds = Bounds;
            WindowState = FormWindowState.Minimized;
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            if (Environment.OSVersion.Version >= new Version(10, 0, 22000))
            {
                int round = 2; // DWMWCP_ROUND; Windows 11 owns the corner clipping.
                Marshal.ThrowExceptionForHR(DwmSetWindowAttribute(Handle, 33, ref round, sizeof(int)));
            }
            var menu = GetSystemMenu(Handle, false);
            AppendMenu(menu, 0x800, UIntPtr.Zero, "");
            AppendMenu(menu, 0, (UIntPtr)PinCommand, "窗口置顶(&T)");
            UpdatePin();
        }

        void UpdatePin()
        {
            CheckMenuItem(GetSystemMenu(Handle, false), PinCommand, TopMost ? 8u : 0u);
            pin.Checked = TopMost;
            pin.AccessibleDescription = TopMost ? "置顶已开启" : "置顶已关闭";
            hints.SetToolTip(pin, TopMost ? "取消置顶" : "开启置顶");
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == 0x112 && (m.WParam.ToInt32() & 0xFFF0) == 0xF020)
            {
                Minimize();
                return;
            }
            if (m.Msg == 0x112 && ((m.WParam.ToInt32() & 0xFFF0) == 0xF030 ||
                ((m.WParam.ToInt32() & 0xFFF0) == 0xF120 && WindowState == FormWindowState.Maximized)))
            {
                ToggleMaximize();
                return;
            }
            if (m.Msg == 0x83)
            {
                m.Result = IntPtr.Zero;
                return;
            }
            if (m.Msg == 0x112 && (m.WParam.ToInt32() & 0xFFF0) == PinCommand)
            {
                TopMost = !TopMost;
                UpdatePin();
                return;
            }
            base.WndProc(ref m);
            if (m.Msg == 0x5) // WM_SIZE: wait until the native restore has finished.
            {
                if (m.WParam == (IntPtr)1) minimized = true;
                else if (minimized)
                {
                    minimized = false;
                    bool restoreNormal = minimizedFromNormal && m.WParam == IntPtr.Zero;
                    minimizedFromNormal = false;
                    if (restoreNormal)
                    {
                        Rectangle target = normalBounds;
                        BeginInvoke((Action)(() => Bounds = target));
                    }
                }
            }
            if (m.Msg == 0x84 && m.Result == (IntPtr)1 && WindowState == FormWindowState.Normal)
            {
                long position = m.LParam.ToInt64();
                Point point = PointToClient(new Point((short)(position & 0xFFFF), (short)((position >> 16) & 0xFFFF)));
                int edge = Math.Max(5, SystemInformation.FrameBorderSize.Width);
                bool left = point.X < edge, right = point.X >= ClientSize.Width - edge;
                bool top = point.Y < edge, bottom = point.Y >= ClientSize.Height - edge;
                int hit = top ? (left ? 13 : right ? 14 : 12) : bottom ? (left ? 16 : right ? 17 : 15) : left ? 10 : right ? 11 : 1;
                m.Result = (IntPtr)hit;
            }
        }

        async System.Threading.Tasks.Task Initialize()
        {
            try
            {
                string root = AppDomain.CurrentDomain.BaseDirectory;
                string app = Path.Combine(root, "app");
                if (!File.Exists(Path.Combine(app, "index.html")))
                    throw new FileNotFoundException("缺少 app/index.html，请完整解压便携包。");
                CoreWebView2Environment.GetAvailableBrowserVersionString();
                string data = Path.Combine(root, "WebView2Data");
                Directory.CreateDirectory(data);
                var environment = await CoreWebView2Environment.CreateAsync(null, data);
                await web.EnsureCoreWebView2Async(environment);
                var core = web.CoreWebView2;
                core.Settings.IsGeneralAutofillEnabled = false;
                core.Settings.IsPasswordAutosaveEnabled = false;
                core.Settings.AreDefaultContextMenusEnabled = false;
                core.Settings.AreDevToolsEnabled = false;
                core.Settings.IsStatusBarEnabled = false;
                web.ZoomFactor = 1;
                core.SetVirtualHostNameToFolderMapping("formuladesk.example", app, CoreWebView2HostResourceAccessKind.Deny);
                core.NavigationStarting += (sender, e) => { e.Cancel = e.Uri != Page; };
                core.NewWindowRequested += (sender, e) => { e.Handled = true; };
                core.PermissionRequested += (sender, e) => { e.State = CoreWebView2PermissionState.Deny; };
                core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
                core.WebResourceRequested += (sender, e) =>
                {
                    if (!e.Request.Uri.StartsWith("https://formuladesk.example/", StringComparison.Ordinal) &&
                        !e.Request.Uri.StartsWith("data:", StringComparison.Ordinal))
                        e.Response = environment.CreateWebResourceResponse(null, 403, "Offline only", "");
                };
                core.WebMessageReceived += ReceiveMessage;
                core.NavigationCompleted += (sender, e) =>
                {
                    ready = e.IsSuccess;
                    if (!e.IsSuccess)
                        MessageBox.Show(this, "本地页面加载失败，错误为 " + e.WebErrorStatus, "FormulaDesk");
                };
                core.ProcessFailed += (sender, e) =>
                {
                    ready = false;
                    MessageBox.Show(this, "编辑器进程中断，请在关闭前复制仍可访问的内容。", "FormulaDesk");
                };
                core.Navigate(Page);
            }
            catch (WebView2RuntimeNotFoundException)
            {
                StartupError("系统缺少 WebView2 Runtime。可安装微软运行时，或打开 app/index.html 使用浏览器版。");
            }
            catch (Exception error)
            {
                // Initialization is a UI boundary. Preserve the concrete failure for the user.
                StartupError("启动失败。请使用可写目录并完整解压便携包。\n" + error.Message);
            }
        }

        void StartupError(string reason)
        {
            MessageBox.Show(this, reason, "FormulaDesk", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }

        void ReceiveMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            if (e.Source != Page) return;
            Dictionary<string, object> message;
            try
            {
                message = json.Deserialize<Dictionary<string, object>>(e.WebMessageAsJson);
            }
            catch (ArgumentException) { return; }
            if (message == null || !message.ContainsKey("type")) return;
            string type = message["type"] as string;
            if (type == "dirty")
            {
                object value;
                if (message.TryGetValue("value", out value) && value is bool) dirty = (bool)value;
                return;
            }
            if (type != "layout") return;
            double baseCss, totalCss, scale;
            object panel;
            if (!Number(message, "base", out baseCss) || !Number(message, "total", out totalCss) ||
                !Number(message, "scale", out scale) || scale < 0.5 || scale > 5 ||
                !message.TryGetValue("panel", out panel) ||
                (panel != null && panel as string != "examples" && panel as string != "source" && panel as string != "help"))
                return;
            bool isExpanded = panel != null;
            if (WindowState != FormWindowState.Normal) return;
            int basePixels = (int)Math.Ceiling(baseCss * scale);
            if (!sized)
            {
                int chrome = Height - web.ClientSize.Height;
                Height = Math.Min(basePixels + chrome,
                    Screen.FromControl(this).WorkingArea.Bottom - Top);
                sized = true;
            }
            else if (!expanded && !isExpanded && basePixels != naturalBase)
            {
                Height = Math.Min(Height + basePixels - naturalBase,
                    Screen.FromControl(this).WorkingArea.Bottom - Top);
            }
            naturalBase = basePixels;
            if (isExpanded && !expanded) collapsedHeight = Height;
            int baseline = expanded || isExpanded ? collapsedHeight : Height;
            int addition = isExpanded ? (int)Math.Ceiling(Math.Max(0, totalCss - baseCss) * scale) : 0;
            int limit = Math.Max(MinimumSize.Height, Screen.FromControl(this).WorkingArea.Bottom - Top);
            int target = WindowHeight.Calculate(baseline, addition, limit, isExpanded);
            expanded = isExpanded;
            if (Height != target) Height = target;
        }

        static bool Number(Dictionary<string, object> data, string key, out double value)
        {
            object item;
            value = 0;
            if (!data.TryGetValue(key, out item) || !(item is int || item is decimal || item is double))
                return false;
            value = Convert.ToDouble(item);
            return !Double.IsNaN(value) && !Double.IsInfinity(value) && value >= 0 && value <= 100000;
        }

        void ConfirmClose(object sender, FormClosingEventArgs e)
        {
            if (ready && dirty &&
                MessageBox.Show(this, "还有尚未复制的内容，确定关闭？", "FormulaDesk",
                    MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                e.Cancel = true;
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) { web.Dispose(); hints.Dispose(); }
            base.Dispose(disposing);
        }

        [DllImport("user32.dll")] static extern IntPtr GetSystemMenu(IntPtr window, bool revert);
        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr window, int attribute, ref int value, int size);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool AppendMenu(IntPtr menu, uint flags, UIntPtr id, string label);
        [DllImport("user32.dll")] static extern uint CheckMenuItem(IntPtr menu, uint item, uint flags);
        [DllImport("user32.dll")] static extern bool ReleaseCapture();
        [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr window, uint message, IntPtr wparam, IntPtr lparam);
        [DllImport("user32.dll")] static extern uint TrackPopupMenu(IntPtr menu, uint flags, int x, int y, int reserved, IntPtr window, IntPtr rectangle);
    }
}
