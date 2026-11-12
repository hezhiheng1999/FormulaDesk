using System;

namespace FormulaDesk
{
    public static class WindowHeight
    {
        public static int Calculate(int baseline, int addition, int available, bool expanded)
        {
            return expanded ? (int)Math.Min((long)baseline + addition, available) : baseline;
        }
    }
}
