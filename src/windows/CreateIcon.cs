using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

// Render the same centered f path used by the bundled page favicon.
class CreateIcon
{
    static void Main(string[] args)
    {
        int[] sizes = {16, 20, 24, 32, 40, 48, 64, 128, 256};
        byte[][] images = new byte[sizes.Length][];
        for (int i = 0; i < sizes.Length; i++)
        {
            using (var large = new Bitmap(sizes[i] * 4, sizes[i] * 4))
            using (var g = Graphics.FromImage(large))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.ScaleTransform(large.Width / 40f, large.Height / 40f);
                using (var background = new GraphicsPath())
                using (var blue = new SolidBrush(Color.FromArgb(36, 93, 216)))
                {
                    background.AddArc(0, 0, 24, 24, 180, 90);
                    background.AddArc(16, 0, 24, 24, 270, 90);
                    background.AddArc(16, 16, 24, 24, 0, 90);
                    background.AddArc(0, 16, 24, 24, 90, 90);
                    background.CloseFigure();
                    g.FillPath(blue, background);
                }
                g.TranslateTransform(6.5f, 6.5f);
                g.ScaleTransform(27f / 24, 27f / 24);
                using (var path = new GraphicsPath())
                using (var pen = new Pen(Color.White, 1.8f))
                {
                    pen.StartCap = pen.EndCap = LineCap.Round;
                    path.AddBezier(17, 4, 14, 3, 12, 4.5f, 11.4f, 7.5f);
                    path.AddLine(11.4f, 7.5f, 9.4f, 17.5f);
                    path.AddBezier(9.4f, 17.5f, 8.8f, 20.5f, 7.5f, 21, 5.5f, 20);
                    path.StartFigure();
                    path.AddLine(7, 10, 16, 10);
                    g.DrawPath(pen, path);
                }
                using (var bitmap = new Bitmap(sizes[i], sizes[i]))
                using (var target = Graphics.FromImage(bitmap))
                using (var data = new MemoryStream())
                {
                    target.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    target.DrawImage(large, 0, 0, sizes[i], sizes[i]);
                    bitmap.Save(data, ImageFormat.Png);
                    images[i] = data.ToArray();
                }
            }
        }
        using (var writer = new BinaryWriter(File.Create(args[0])))
        {
            writer.Write((ushort)0);
            writer.Write((ushort)1);
            writer.Write((ushort)sizes.Length);
            int offset = 6 + sizes.Length * 16;
            for (int i = 0; i < sizes.Length; i++)
            {
                writer.Write((byte)(sizes[i] == 256 ? 0 : sizes[i]));
                writer.Write((byte)(sizes[i] == 256 ? 0 : sizes[i]));
                writer.Write((ushort)0);
                writer.Write((ushort)1);
                writer.Write((ushort)32);
                writer.Write(images[i].Length);
                writer.Write(offset);
                offset += images[i].Length;
            }
            foreach (byte[] data in images) writer.Write(data);
        }
    }
}
