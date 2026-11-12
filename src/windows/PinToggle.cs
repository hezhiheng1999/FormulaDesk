using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace FormulaDesk
{
    sealed class PinToggle : CheckBox
    {
        public PinToggle()
        {
            Appearance = Appearance.Button;
            FlatStyle = FlatStyle.Flat;
            FlatAppearance.BorderSize = 0;
            AccessibleName = "窗口置顶";
            AccessibleRole = AccessibleRole.CheckButton;
            Margin = Padding.Empty;
            TabStop = true;
            Checked = true;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.Clear(Checked ? Color.FromArgb(218, 229, 250) : BackColor);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.TranslateTransform(Width / 2f, Height / 2f);
            float scale = Math.Min(Width, Height) / 30f;
            e.Graphics.ScaleTransform(scale, scale);
            if (!Checked) e.Graphics.RotateTransform(40);
            using (var pen = new Pen(Checked ? Color.FromArgb(36, 93, 216) : Color.FromArgb(97, 103, 116), 1.7f))
            {
                e.Graphics.DrawLine(pen, -4, -7, 4, -7);
                e.Graphics.DrawLine(pen, -3, -7, -3, 0);
                e.Graphics.DrawLine(pen, 3, -7, 3, 0);
                e.Graphics.DrawLines(pen, new PointF[] {new PointF(-3, 0), new PointF(-6, 3), new PointF(6, 3), new PointF(3, 0)});
                e.Graphics.DrawLine(pen, 0, 3, 0, 9);
            }
            e.Graphics.ResetTransform();
            if (Focused) ControlPaint.DrawFocusRectangle(e.Graphics, new Rectangle(3, 3, Width - 6, Height - 6));
        }
    }
}
