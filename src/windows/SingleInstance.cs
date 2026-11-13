using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading;
using Microsoft.Win32.SafeHandles;

namespace FormulaDesk
{
    internal sealed class SingleInstance : IDisposable
    {
        readonly EventWaitHandle activation;
        readonly Mutex mutex;
        RegisteredWaitHandle listener;
        public bool IsPrimary { get; private set; }

        public static SingleInstance Create(string installationDirectory)
        {
            string directory = Path.GetFullPath(installationDirectory);
            // Open the directory itself so a junction or a short path identifies the same installation.
            using (var handle = CreateFile(directory, 0, FileShare.ReadWrite | FileShare.Delete,
                        IntPtr.Zero, FileMode.Open, 0x02000000, IntPtr.Zero))
            {
                if (handle.IsInvalid) throw new Win32Exception(Marshal.GetLastWin32Error());
                var path = new StringBuilder(512);
                uint length = GetFinalPathNameByHandle(handle, path, (uint)path.Capacity, 0);
                if (length >= path.Capacity)
                {
                    path.EnsureCapacity(checked((int)length + 1));
                    length = GetFinalPathNameByHandle(handle, path, (uint)path.Capacity, 0);
                }
                if (length == 0) throw new Win32Exception(Marshal.GetLastWin32Error());
                if (length >= path.Capacity) throw new IOException("无法取得便携目录的完整路径。");
                directory = path.ToString().TrimEnd('\\').ToUpperInvariant();
            }
            using (var user = WindowsIdentity.GetCurrent())
            using (var hash = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(user.User.Value + "\n" + directory);
                return new SingleInstance(@"Local\FormulaDesk-" + BitConverter.ToString(hash.ComputeHash(bytes)));
            }
        }

        SingleInstance(string name)
        {
            // Both contenders open the signal before electing a primary. An early Set is retained.
            activation = new EventWaitHandle(false, EventResetMode.AutoReset, name + "-activate");
            try
            {
                mutex = new Mutex(false, name + "-owner");
                try { IsPrimary = mutex.WaitOne(0); }
                catch (AbandonedMutexException) { IsPrimary = true; }
            }
            catch
            {
                if (mutex != null) mutex.Dispose();
                activation.Dispose();
                throw;
            }
        }

        public void StartListening(Action activate)
        {
            if (!IsPrimary || listener != null) throw new InvalidOperationException("主实例只能注册一次唤出监听。");
            listener = ThreadPool.RegisterWaitForSingleObject(activation,
                (state, timeout) => activate(), null, Timeout.Infinite, false);
        }

        public void SignalPrimary()
        {
            if (!activation.Set()) throw new IOException("无法通知已有窗口。");
        }

        public void Dispose()
        {
            if (listener != null) listener.Unregister(null);
            if (IsPrimary) mutex.ReleaseMutex();
            mutex.Dispose();
            activation.Dispose();
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern SafeFileHandle CreateFile(string path, uint access, FileShare share, IntPtr security,
            FileMode creation, uint flags, IntPtr template);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        static extern uint GetFinalPathNameByHandle(SafeFileHandle file, StringBuilder path, uint length, uint flags);
    }
}
