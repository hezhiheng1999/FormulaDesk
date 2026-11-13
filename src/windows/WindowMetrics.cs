using System;
using System.Drawing;

namespace FormulaDesk
{
    internal static class WindowMetrics
    {
        public static int Scale(int logical, int dpi)
        {
            return (int)Math.Ceiling(logical * (double)dpi / 96);
        }

        public static Rectangle Clamp(Rectangle bounds, Rectangle workingArea)
        {
            int width = Math.Min(bounds.Width, workingArea.Width);
            int height = Math.Min(bounds.Height, workingArea.Height);
            return new Rectangle(
                Math.Max(workingArea.Left, Math.Min(bounds.Left, workingArea.Right - width)),
                Math.Max(workingArea.Top, Math.Min(bounds.Top, workingArea.Bottom - height)), width, height);
        }

        public static Rectangle Maximized(Rectangle screen, Rectangle workingArea)
        {
            workingArea.Offset(-screen.Left, -screen.Top);
            return workingArea;
        }
    }
}
