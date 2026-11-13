using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace FormulaDesk
{
    internal sealed class WorksheetDocument
    {
        public readonly string Latex, Note;
        public WorksheetDocument(string latex, string note) { Latex = latex; Note = note; }
    }

    internal static class WorksheetStore
    {
        const int Limit = 1048576;
        static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);

        public static string Serialize(WorksheetDocument document)
        {
            if (document.Latex.Length + (long)document.Note.Length > Limit * 2L) throw TooLarge();
            string json = "{\"format\":\"formuladesk-worksheet\",\"version\":1,\"latex\":" +
                Quote(document.Latex) + ",\"note\":" + Quote(document.Note) + "}";
            if (Utf8.GetByteCount(json) > Limit) throw TooLarge();
            return json;
        }

        public static WorksheetDocument Deserialize(string text)
        {
            if (Utf8.GetByteCount(text) > Limit) throw TooLarge();
            var fields = new FlatJson(text).Read();
            object format, version;
            if (!fields.TryGetValue("format", out format) || !Equals(format, "formuladesk-worksheet"))
                throw new InvalidDataException("无法识别工作单格式。");
            if (!fields.TryGetValue("version", out version) || !Equals(version, 1L))
                throw new InvalidDataException("工作单版本必须为整数 1。");
            if (fields.Count != 4) throw InvalidFields();
            return DocumentFields(fields);
        }

        public static WorksheetDocument ParseSnapshot(string text, out long revision)
        {
            var fields = new FlatJson(text).Read();
            object value;
            if (fields.Count != 3 || !fields.TryGetValue("revision", out value) || !(value is long))
                throw InvalidFields();
            revision = (long)value;
            return DocumentFields(fields);
        }

        static WorksheetDocument DocumentFields(Dictionary<string, object> fields)
        {
            object latex, note;
            if (!fields.TryGetValue("latex", out latex) || !(latex is string) ||
                !fields.TryGetValue("note", out note) || !(note is string)) throw InvalidFields();
            return new WorksheetDocument((string)latex, (string)note);
        }

        static InvalidDataException InvalidFields() { return new InvalidDataException("工作单字段不完整或类型错误。"); }
        static InvalidDataException TooLarge() { return new InvalidDataException("工作单超过 1 MiB（1048576 字节）。"); }

        public static WorksheetDocument Read(string path)
        {
            using (var file = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                if (file.Length > Limit) throw TooLarge();
                byte[] bytes = new byte[(int)file.Length];
                int used = 0;
                while (used < bytes.Length)
                {
                    int count = file.Read(bytes, used, bytes.Length - used);
                    if (count == 0) throw new EndOfStreamException("工作单读取不完整。");
                    used += count;
                }
                int start = used >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF ? 3 : 0;
                try { return Deserialize(Utf8.GetString(bytes, start, used - start)); }
                catch (DecoderFallbackException e) { throw new InvalidDataException("工作单包含无效的 UTF-8 编码。", e); }
            }
        }

        public static void WriteAtomic(string path, WorksheetDocument document)
        {
            WriteAtomic(path, document, File.Exists(path));
        }

        public static void WriteAtomic(string path, WorksheetDocument document, bool overwrite)
        {
            byte[] bytes = Utf8.GetBytes(Serialize(document));
            string temp = Path.Combine(Path.GetDirectoryName(Path.GetFullPath(path)),
                ".formuladesk-" + Guid.NewGuid().ToString("N") + ".tmp");
            bool created = false;
            try
            {
                using (var file = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                {
                    created = true;
                    file.Write(bytes, 0, bytes.Length);
                    file.Flush(true);
                }
                if (overwrite) File.Replace(temp, path, null);
                else File.Move(temp, path);
                created = false;
            }
            finally { if (created) File.Delete(temp); }
        }

        // Quote UTF-16 code units directly, including a lone surrogate from an unfinished input.
        internal static string Quote(string value)
        {
            var result = new StringBuilder(value.Length + 2).Append('"');
            for (int i = 0; i < value.Length; i++)
            {
                char c = value[i];
                switch (c)
                {
                    case '"': result.Append("\\\""); break;
                    case '\\': result.Append("\\\\"); break;
                    case '\n': result.Append("\\n"); break;
                    case '\r': result.Append("\\r"); break;
                    case '\t': result.Append("\\t"); break;
                    default:
                        if (char.IsHighSurrogate(c) && i + 1 < value.Length && char.IsLowSurrogate(value[i+1]))
                            result.Append(c).Append(value[++i]);
                        else if (c < ' ' || char.IsSurrogate(c)) result.Append("\\u").Append(((int)c).ToString("x4"));
                        else result.Append(c);
                        break;
                }
            }
            return result.Append('"').ToString();
        }

        // Both contracts are flat JSON objects with only strings and nonnegative integers.
        // JavaScriptSerializer also accepts JavaScript literals and coerces date-shaped strings.
        sealed class FlatJson
        {
            readonly string text;
            int pos;
            public FlatJson(string text) { this.text = text; }
            static InvalidDataException Syntax() { return new InvalidDataException("工作单 JSON 语法或字段值无效。"); }

            void Space() { while (pos < text.Length && " \t\r\n".IndexOf(text[pos]) >= 0) pos++; }
            bool Take(char c)
            {
                Space();
                if (pos == text.Length || text[pos] != c) return false;
                pos++;
                return true;
            }
            string ReadString()
            {
                if (!Take('"')) throw Syntax();
                var result = new StringBuilder();
                while (pos < text.Length)
                {
                    char c = text[pos++];
                    if (c == '"') return result.ToString();
                    if (c < ' ') throw Syntax();
                    if (c != '\\') { result.Append(c); continue; }
                    if (pos == text.Length) throw Syntax();
                    c = text[pos++];
                    if (c == 'u')
                    {
                        if (pos + 4 > text.Length) throw Syntax();
                        int code = 0;
                        for (int i = 0; i < 4; i++)
                        {
                            char digit = text[pos++];
                            if (!Uri.IsHexDigit(digit)) throw Syntax();
                            code = (code << 4) | Uri.FromHex(digit);
                        }
                        result.Append((char)code);
                    }
                    else
                    {
                        int escape = "\"\\/bfnrt".IndexOf(c);
                        if (escape < 0) throw Syntax();
                        result.Append("\"\\/\b\f\n\r\t"[escape]);
                    }
                }
                throw Syntax();
            }
            long ReadInteger()
            {
                int start = pos;
                while (pos < text.Length && text[pos] >= '0' && text[pos] <= '9') pos++;
                long value;
                if (start == pos || (text[start] == '0' && pos - start > 1) ||
                    !Int64.TryParse(text.Substring(start, pos - start), NumberStyles.None,
                        CultureInfo.InvariantCulture, out value)) throw Syntax();
                return value;
            }
            public Dictionary<string, object> Read()
            {
                if (!Take('{')) throw Syntax();
                var fields = new Dictionary<string, object>(StringComparer.Ordinal);
                do
                {
                    string key = ReadString();
                    if (fields.Count == 4 || fields.ContainsKey(key) || !Take(':')) throw Syntax();
                    Space();
                    fields.Add(key, pos < text.Length && text[pos] == '"' ? (object)ReadString() : ReadInteger());
                } while (Take(','));
                if (!Take('}')) throw Syntax();
                Space();
                if (pos != text.Length) throw Syntax();
                return fields;
            }
        }
    }
}
