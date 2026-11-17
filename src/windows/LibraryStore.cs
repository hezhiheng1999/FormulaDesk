using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

namespace FormulaDesk
{
    internal static class LibraryStore
    {
        internal const int Limit = 4 * 1024 * 1024;
        static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);

        static void Validate(string text)
        {
            if (text == null || Utf8.GetByteCount(text) > Limit)
                throw new InvalidDataException("公式库超过 4 MiB。");
            Dictionary<string, object> value;
            try { value = new JavaScriptSerializer { MaxJsonLength = Limit, RecursionLimit = 64 }
                    .Deserialize<Dictionary<string, object>>(text); }
            catch (ArgumentException e) { throw new InvalidDataException("公式库不是有效的 JSON 文件。", e); }
            catch (InvalidOperationException e) { throw new InvalidDataException("公式库结构无法读取。", e); }
            object format, version, groups;
            if (value == null || value.Count != 3 || !value.TryGetValue("format", out format) ||
                !Equals(format, "formuladesk-library") || !value.TryGetValue("version", out version) ||
                !(version is int) || (int)version != 1 || !value.TryGetValue("groups", out groups) ||
                !(groups is IList)) throw new InvalidDataException("无法识别公式库格式或版本。");
        }

        internal static string Read(string path)
        {
            using (var file = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                if (file.Length > Limit) throw new InvalidDataException("公式库超过 4 MiB。");
                var bytes = new byte[(int)file.Length];
                int used = 0;
                while (used < bytes.Length)
                {
                    int count = file.Read(bytes, used, bytes.Length - used);
                    if (count == 0) throw new EndOfStreamException("公式库读取不完整。");
                    used += count;
                }
                int start = used >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF ? 3 : 0;
                string text;
                try { text = Utf8.GetString(bytes, start, used - start); }
                catch (DecoderFallbackException e) { throw new InvalidDataException("公式库包含无效的 UTF-8 编码。", e); }
                Validate(text);
                return text;
            }
        }

        internal static void WriteAtomic(string path, string text, bool replaceDamaged = false, bool keepBackup = true)
        {
            Validate(text);
            byte[] bytes = Utf8.GetBytes(text);
            bool exists = File.Exists(path);
            string backup = keepBackup ? path + ".bak" : null;
            if (exists && keepBackup)
            {
                // The page validates the full schema; a readable JSON envelope can
                // still be a damaged library. Never replace a good backup with it.
                if (replaceDamaged) backup = path + ".damaged-" + Guid.NewGuid().ToString("N");
                else Read(path);
            }
            string temp = Path.Combine(Path.GetDirectoryName(Path.GetFullPath(path)), ".formuladesk-library-" + Guid.NewGuid().ToString("N") + ".tmp");
            bool created = false;
            try
            {
                using (var file = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                {
                    created = true;
                    file.Write(bytes, 0, bytes.Length);
                    file.Flush(true);
                }
                if (exists) File.Replace(temp, path, backup);
                else File.Move(temp, path);
                created = false;
            }
            finally { if (created) File.Delete(temp); }
        }
    }
}
