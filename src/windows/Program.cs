using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
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
            try
            {
                using (var instance = SingleInstance.Create(AppDomain.CurrentDomain.BaseDirectory))
                {
                    if (!instance.IsPrimary) { instance.SignalPrimary(); return; }
                    using (var window = new DeskWindow())
                    {
                        window.Shown += (sender, args) => {
                            var ui = SynchronizationContext.Current;
                            instance.StartListening(() => ui.Post(state => {
                                if (!window.IsDisposed && !window.Disposing) window.ShowEditor();
                            }, null));
                        };
                        Application.Run(window);
                    }
                }
            }
            catch (Win32Exception error) { InstanceError(error); }
            catch (IOException error) { InstanceError(error); }
            catch (UnauthorizedAccessException error) { InstanceError(error); }
            catch (WaitHandleCannotBeOpenedException error) { InstanceError(error); }
        }

        static void InstanceError(Exception error)
        {
            MessageBox.Show("实例协调失败。\n" + error.Message, "FormulaDesk", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    sealed class DeskWindow : Form
    {
        const string Page = "https://formuladesk.example/index.html";
        const int PinCommand = 0x1F10;
        const int HotKeyId = 1;
        readonly WebView2 web = new WebView2();
        readonly JavaScriptSerializer json = new JavaScriptSerializer();
        readonly PinToggle pin = new PinToggle();
        readonly Panel caption = new Panel();
        readonly Label title = new Label();
        readonly PictureBox logo = new PictureBox();
        readonly FlowLayoutPanel actions = new FlowLayoutPanel();
        readonly ToolTip hints = new ToolTip();
        bool dirty;
        bool ready;
        bool sized;
        bool expanded;
        double collapsedHeight96;
        double naturalBase96;
        int dpi = 96;
        Rectangle normalBounds;
        Rectangle normalArea;
        int normalDpi;
        bool minimizedFromNormal;
        bool minimized;
        bool hotKeyRegistered;
        bool shown;
        string hotKeyError;
        bool worksheetBusy;

        public DeskWindow()
        {
            Text = "FormulaDesk";
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            FormBorderStyle = FormBorderStyle.None;
            // A narrow exposed edge keeps native resizing available beside WebView2.
            BackColor = Color.FromArgb(243, 244, 246);
            AutoScaleMode = AutoScaleMode.None;
            StartPosition = FormStartPosition.Manual;
            var area = Screen.PrimaryScreen.WorkingArea;
            Location = area.Location;
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
            caption.Dock = DockStyle.Top;
            caption.BackColor = BackColor;
            title.Text = "FormulaDesk";
            title.Dock = DockStyle.Fill;
            title.TextAlign = ContentAlignment.MiddleLeft;
            title.Font = SystemFonts.MessageBoxFont;
            logo.Image = Icon.ToBitmap();
            logo.SizeMode = PictureBoxSizeMode.Zoom;
            actions.Dock = DockStyle.Right;
            actions.WrapContents = false;
            actions.Margin = actions.Padding = Padding.Empty;
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
                Margin = Padding.Empty, TabStop = true,
                Font = new Font("Segoe UI", 13), BackColor = caption.BackColor };
            button.FlatAppearance.BorderSize = 0;
            hints.SetToolTip(button, label);
            button.Click += (sender, e) => click();
            return button;
        }

        int Px(int logical) { return WindowMetrics.Scale(logical, dpi); }

        void ApplyChrome(Rectangle area)
        {
            SuspendLayout();
            Padding = new Padding(Px(3));
            caption.Height = Px(32);
            title.Padding = new Padding(Px(34), 0, 0, 0);
            logo.Size = new Size(Px(18), Px(18));
            logo.Location = new Point(Px(9), (caption.Height - logo.Height) / 2);
            actions.Width = actions.Controls.Count * Px(40);
            foreach (Control action in actions.Controls) action.Size = new Size(Px(40), caption.Height);
            MinimumSize = new Size(Math.Min(Px(400), area.Width), Math.Min(Px(220), area.Height));
            ResumeLayout(true);
        }

        protected override void OnLoad(EventArgs e)
        {
            dpi = DeviceDpi;
            var area = Screen.FromControl(this).WorkingArea;
            ApplyChrome(area);
            Bounds = WindowMetrics.Clamp(new Rectangle(area.Right - Px(590), area.Top + Px(30),
                Px(560), Px(560)), area);
            base.OnLoad(e);
        }

        protected override void OnDpiChanged(DpiChangedEventArgs e)
        {
            base.OnDpiChanged(e);
            // This form owns the device-pixel bounds, including its custom caption.
            e.Cancel = true;
            dpi = e.DeviceDpiNew;
            var area = Screen.FromRectangle(e.SuggestedRectangle).WorkingArea;
            ApplyChrome(area);
            if (WindowState == FormWindowState.Normal)
                Bounds = WindowMetrics.Clamp(e.SuggestedRectangle, area);
            RequestLayoutReport();
        }

        void RememberNormal()
        {
            normalBounds = Bounds;
            normalArea = Screen.FromControl(this).WorkingArea;
            normalDpi = dpi;
        }

        void RestoreNormal(Rectangle area)
        {
            if (normalBounds.IsEmpty || WindowState != FormWindowState.Normal) return;
            double ratio = (double)dpi / normalDpi;
            var target = new Rectangle(area.Left + (int)Math.Round((normalBounds.Left - normalArea.Left) * ratio),
                area.Top + (int)Math.Round((normalBounds.Top - normalArea.Top) * ratio),
                (int)Math.Round(normalBounds.Width * ratio), (int)Math.Round(normalBounds.Height * ratio));
            Bounds = WindowMetrics.Clamp(target, area);
            RequestLayoutReport();
        }

        void RequestLayoutReport()
        {
            if (ready) web.CoreWebView2.PostWebMessageAsJson("{\"type\":\"measure\"}");
        }

        void ToggleMaximize()
        {
            if (WindowState == FormWindowState.Maximized)
            {
                var area = Screen.FromControl(this).WorkingArea;
                WindowState = FormWindowState.Normal;
                RestoreNormal(area);
                return;
            }
            if (WindowState == FormWindowState.Normal) RememberNormal();
            WindowState = FormWindowState.Maximized;
        }

        void Minimize()
        {
            minimizedFromNormal = WindowState == FormWindowState.Normal;
            if (minimizedFromNormal) RememberNormal();
            WindowState = FormWindowState.Minimized;
        }

        public void ShowEditor()
        {
            if (!Visible) Show();
            if (WindowState == FormWindowState.Minimized) ShowWindow(Handle, 9); // SW_RESTORE
            IntPtr target = IsWindowEnabled(Handle) ? Handle : GetLastActivePopup(Handle);
            if (SetForegroundWindow(target))
            {
                if (target == Handle && ready && !ContainsFocus) web.Focus();
            }
            else
            {
                var flash = new FlashInfo { Size = (uint)Marshal.SizeOf(typeof(FlashInfo)), Window = Handle,
                    Flags = 3, Count = 3 };
                FlashWindowEx(ref flash);
            }
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            shown = true;
            if (hotKeyError != null) BeginInvoke((Action)ReportHotKeyError);
        }

        void ReportHotKeyError()
        {
            if (hotKeyError == null || IsDisposed) return;
            MessageBox.Show(this, "无法注册 Ctrl+Alt+F：" + hotKeyError +
                "\n仍可正常编辑，再次启动本目录中的 FormulaDesk.exe 可显示窗口。",
                "FormulaDesk", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            hotKeyRegistered = RegisterHotKey(Handle, HotKeyId, 0x4000 | 0x2 | 0x1, (uint)Keys.F);
            hotKeyError = hotKeyRegistered ? null : new Win32Exception(Marshal.GetLastWin32Error()).Message;
            if (shown && hotKeyError != null) BeginInvoke((Action)ReportHotKeyError);
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

        protected override void OnHandleDestroyed(EventArgs e)
        {
            if (hotKeyRegistered) UnregisterHotKey(Handle, HotKeyId);
            hotKeyRegistered = false;
            base.OnHandleDestroyed(e);
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
            if (m.Msg == 0x0312 && m.WParam == (IntPtr)HotKeyId)
            {
                if (Visible && WindowState != FormWindowState.Minimized && GetForegroundWindow() == Handle &&
                    IsWindowEnabled(Handle)) Hide();
                else ShowEditor();
                return;
            }
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
                if (IsZoomed(m.HWnd))
                {
                    // Windows can extend a maximized resize frame beyond the monitor. Keep its client reachable.
                    var frame = (NativeRect)Marshal.PtrToStructure(m.LParam, typeof(NativeRect));
                    var proposed = Rectangle.FromLTRB(frame.Left, frame.Top, frame.Right, frame.Bottom);
                    var client = Rectangle.Intersect(proposed, Screen.FromRectangle(proposed).WorkingArea);
                    if (!client.IsEmpty)
                    {
                        frame.Left = client.Left; frame.Top = client.Top;
                        frame.Right = client.Right; frame.Bottom = client.Bottom;
                        Marshal.StructureToPtr(frame, m.LParam, false);
                    }
                }
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
            if (m.Msg == 0x24) // WM_GETMINMAXINFO. The custom client fills the entire frame.
            {
                var screen = Screen.FromHandle(m.HWnd);
                var maximum = WindowMetrics.Maximized(screen.Bounds, screen.WorkingArea);
                var limits = (MinMaxInfo)Marshal.PtrToStructure(m.LParam, typeof(MinMaxInfo));
                limits.MaxPosition = maximum.Location;
                limits.MaxSize = new Point(maximum.Width, maximum.Height);
                Marshal.StructureToPtr(limits, m.LParam, false);
            }
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
                        BeginInvoke((Action)(() => RestoreNormal(Screen.FromControl(this).WorkingArea)));
                    }
                }
            }
            if (m.Msg == 0x84 && m.Result == (IntPtr)1 && WindowState == FormWindowState.Normal)
            {
                long position = m.LParam.ToInt64();
                Point point = PointToClient(new Point((short)(position & 0xFFFF), (short)((position >> 16) & 0xFFFF)));
                int edge = Px(5);
                bool left = point.X < edge, right = point.X >= ClientSize.Width - edge;
                bool top = point.Y < edge, bottom = point.Y >= ClientSize.Height - edge;
                int hit = top ? (left ? 13 : right ? 14 : 12) : bottom ? (left ? 16 : right ? 17 : 15) : left ? 10 : right ? 11 : 1;
                m.Result = (IntPtr)hit;
            }
            if (IsHandleCreated && (m.Msg == 0x7E || (m.Msg == 0x1A && m.WParam == (IntPtr)47)))
            {
                var area = Screen.FromControl(this).WorkingArea;
                ApplyChrome(area);
                if (WindowState == FormWindowState.Normal) Bounds = WindowMetrics.Clamp(Bounds, area);
                RequestLayoutReport();
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
                core.Settings.AreBrowserAcceleratorKeysEnabled = false;
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
            if (type == "worksheet-open" || type == "worksheet-save")
            {
                if (message.Count == 1) QueueWorksheet(type == "worksheet-save");
                return;
            }
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
            double base96 = Math.Ceiling(baseCss * scale) * 96.0 / dpi;
            if (!sized)
            {
                collapsedHeight96 = base96 + (Height - web.ClientSize.Height) * 96.0 / dpi;
                sized = true;
            }
            else if (!expanded) collapsedHeight96 = Height * 96.0 / dpi + base96 - naturalBase96;
            else collapsedHeight96 += base96 - naturalBase96;
            naturalBase96 = base96;
            int baseline = (int)Math.Round(collapsedHeight96 * dpi / 96);
            int addition = isExpanded ? (int)Math.Ceiling(Math.Max(0, totalCss - baseCss) * scale) : 0;
            int limit = Math.Max(MinimumSize.Height, Screen.FromControl(this).WorkingArea.Bottom - Top);
            int target = Math.Min(limit, WindowHeight.Calculate(baseline, addition, limit, isExpanded));
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

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            // The page handles WebView keyboard input, including IME composition.
            if (!web.ContainsFocus && (keyData == (Keys.Control | Keys.O) || keyData == (Keys.Control | Keys.S)))
            {
                QueueWorksheet(keyData == (Keys.Control | Keys.S));
                return true;
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        void QueueWorksheet(bool save)
        {
            if (worksheetBusy || !ready) return;
            worksheetBusy = true;
            // File dialogs run their own message loop. Leave the WebView2 callback before opening one.
            BeginInvoke((Action)(async () => await RunWorksheet(save)));
        }

        async Task<string> CaptureSnapshot()
        {
            if (!ready || web.CoreWebView2.Source != Page) throw new InvalidOperationException("编辑器尚未准备好。");
            string result = await web.CoreWebView2.ExecuteScriptAsync("window.FormulaDeskWorkspace.getSnapshot()");
            if (!ready || web.CoreWebView2.Source != Page) throw new InvalidOperationException("编辑器已中断。");
            return result;
        }

        async Task RunWorksheet(bool save)
        {
            const string filter = "FormulaDesk 工作单 (*.fdesk.json)|*.fdesk.json|JSON 文件 (*.json)|*.json|所有文件 (*.*)|*.*";
            try
            {
                long revision;
                if (save)
                {
                    var document = WorksheetStore.ParseSnapshot(await CaptureSnapshot(), out revision);
                    using (var dialog = new SaveFileDialog { Title = "保存工作单", Filter = filter,
                        DefaultExt = "fdesk.json", FileName = "工作单.fdesk.json", OverwritePrompt = false,
                        RestoreDirectory = true, SupportMultiDottedExtensions = true })
                    {
                        bool overwrite = false;
                        dialog.FileOk += (sender, e) => {
                            overwrite = File.Exists(dialog.FileName);
                            if (overwrite) e.Cancel = MessageBox.Show(this,
                                "覆盖已有工作单“" + Path.GetFileName(dialog.FileName) + "”？", "保存工作单",
                                MessageBoxButtons.YesNo, MessageBoxIcon.Question, MessageBoxDefaultButton.Button2)
                                != DialogResult.Yes;
                        };
                        if (dialog.ShowDialog(this) != DialogResult.OK) return;
                        WorksheetStore.WriteAtomic(dialog.FileName, document, overwrite);
                    }
                    PostWorksheetMessage("{\"type\":\"worksheet-saved\",\"revision\":" +
                        revision.ToString(System.Globalization.CultureInfo.InvariantCulture) + "}");
                }
                else
                {
                    WorksheetDocument document;
                    using (var dialog = new OpenFileDialog { Title = "打开工作单", Filter = filter,
                        CheckFileExists = true, RestoreDirectory = true })
                    {
                        if (dialog.ShowDialog(this) != DialogResult.OK) return;
                        document = WorksheetStore.Read(dialog.FileName);
                    }
                    var current = WorksheetStore.ParseSnapshot(await CaptureSnapshot(), out revision);
                    if ((current.Latex.Length > 0 || current.Note.Length > 0) &&
                        MessageBox.Show(this, "用工作单替换当前公式和说明？替换后可恢复上次内容。", "打开工作单",
                            MessageBoxButtons.YesNo, MessageBoxIcon.Question, MessageBoxDefaultButton.Button2)
                            != DialogResult.Yes) return;
                    PostWorksheetMessage("{\"type\":\"worksheet-opened\",\"revision\":" +
                        revision.ToString(System.Globalization.CultureInfo.InvariantCulture) +
                        ",\"latex\":" + WorksheetStore.Quote(document.Latex) +
                        ",\"note\":" + WorksheetStore.Quote(document.Note) + "}");
                }
            }
            catch (InvalidDataException error) { WorksheetError(error); }
            catch (IOException error) { WorksheetError(error); }
            catch (UnauthorizedAccessException error) { WorksheetError(error); }
            catch (InvalidOperationException error) { WorksheetError(error); }
            catch (COMException error) { WorksheetError(error); }
            finally { worksheetBusy = false; }
        }

        void PostWorksheetMessage(string data)
        {
            if (!ready || web.CoreWebView2.Source != Page) throw new InvalidOperationException("无法通知本地编辑器。");
            web.CoreWebView2.PostWebMessageAsJson(data);
        }

        void WorksheetError(Exception error)
        {
            MessageBox.Show(this, error.Message, "工作单操作失败", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }

        void ConfirmClose(object sender, FormClosingEventArgs e)
        {
            if (worksheetBusy) { e.Cancel = true; return; }
            if (dirty &&
                MessageBox.Show(this, "当前内容尚未完整复制或保存为工作单，确定关闭？", "FormulaDesk",
                    MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                e.Cancel = true;
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) { web.Dispose(); hints.Dispose(); }
            base.Dispose(disposing);
        }

        [DllImport("user32.dll")] static extern IntPtr GetSystemMenu(IntPtr window, bool revert);
        [DllImport("user32.dll", SetLastError = true)] static extern bool RegisterHotKey(IntPtr window, int id, uint modifiers, uint key);
        [DllImport("user32.dll")] static extern bool UnregisterHotKey(IntPtr window, int id);
        [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] static extern IntPtr GetLastActivePopup(IntPtr window);
        [DllImport("user32.dll")] static extern bool IsWindowEnabled(IntPtr window);
        [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);
        [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr window, int command);
        [StructLayout(LayoutKind.Sequential)]
        struct FlashInfo { public uint Size; public IntPtr Window; public uint Flags, Count, Timeout; }
        [StructLayout(LayoutKind.Sequential)]
        struct MinMaxInfo { public Point Reserved, MaxSize, MaxPosition, MinTrack, MaxTrack; }
        [StructLayout(LayoutKind.Sequential)]
        struct NativeRect { public int Left, Top, Right, Bottom; }
        [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr window);
        [DllImport("user32.dll")] static extern bool FlashWindowEx(ref FlashInfo info);
        [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr window, int attribute, ref int value, int size);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool AppendMenu(IntPtr menu, uint flags, UIntPtr id, string label);
        [DllImport("user32.dll")] static extern uint CheckMenuItem(IntPtr menu, uint item, uint flags);
        [DllImport("user32.dll")] static extern bool ReleaseCapture();
        [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr window, uint message, IntPtr wparam, IntPtr lparam);
        [DllImport("user32.dll")] static extern uint TrackPopupMenu(IntPtr menu, uint flags, int x, int y, int reserved, IntPtr window, IntPtr rectangle);
    }
}
