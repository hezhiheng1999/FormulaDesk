"""Real Windows I/O checks for the explicitly saved formula library."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_windows import compile_check

ROOT = Path(__file__).resolve().parents[1]

class LibraryStoreTests(unittest.TestCase):
    @unittest.skipUnless(os.name == "nt", "Windows library I/O")
    def test_atomic_library_save_backup_and_failure_preserve_data(self):
        self.assertTrue((ROOT / "src/windows/LibraryStore.cs").is_file(), "LibraryStore is not implemented")
        with tempfile.TemporaryDirectory() as directory:
            exe = compile_check(directory, r'''
using System;
using System.IO;
using FormulaDesk;
class Check {
 static string Doc(string label) { return "{\"format\":\"formuladesk-library\",\"version\":1,\"groups\":[{\"id\":\"a\",\"label\":\""+label+"\",\"items\":[]}]}"; }
 static void Reject(Action action) { try { action(); } catch(InvalidDataException) { return; } throw new Exception("invalid accepted"); }
 static void Main(string[] args) {
  var path=Path.Combine(args[0],"FormulaDesk.library.json");
  string original=Doc("中文原稿"), next=Doc("修改后");
  LibraryStore.WriteAtomic(path,original);
  if(LibraryStore.Read(path)!=original) throw new Exception("raw changed");
  LibraryStore.WriteAtomic(path,next);
  if(LibraryStore.Read(path)!=next || LibraryStore.Read(path+".bak")!=original) throw new Exception("backup");
  using(File.Open(path,FileMode.Open,FileAccess.Read,FileShare.Read)) {
   try { LibraryStore.WriteAtomic(path,Doc("locked")); throw new Exception("lock ignored"); } catch(IOException) {}
  }
  if(LibraryStore.Read(path)!=next || LibraryStore.Read(path+".bak")!=original) throw new Exception("failed save changed data");
  foreach(string bad in new[]{"null","{}","not json",Doc("x").Replace(":1,",":2,"),new string(' ',4194305)}) Reject(()=>LibraryStore.WriteAtomic(path,bad));
  if(LibraryStore.Read(path)!=next) throw new Exception("invalid overwrote");
  string damagedSchema="{\"format\":\"formuladesk-library\",\"version\":1,\"groups\":[null]}";
  File.WriteAllText(path,damagedSchema);
  LibraryStore.WriteAtomic(path,next,true);
  if(LibraryStore.Read(path+".bak")!=original || Directory.GetFiles(args[0],"*.damaged-*").Length!=1) {
   Console.Error.WriteLine("schema damage overwrote good backup"); Environment.Exit(1);
  }
  File.WriteAllBytes(path,new byte[]{0xc3,0x28});
  Reject(()=>LibraryStore.Read(path));
  Reject(()=>LibraryStore.WriteAtomic(path,original));
  LibraryStore.WriteAtomic(path,original,true);
  if(Directory.GetFiles(args[0],"*.damaged-*").Length!=2 || LibraryStore.Read(path+".bak")!=original) throw new Exception("damaged evidence or good backup lost");
  if(Directory.GetFiles(args[0],"*.tmp").Length!=0) throw new Exception("temp leak");
 }
}''', ["LibraryStore.cs"], ["System.Web.Extensions.dll"])
            subprocess.run([str(exe), directory], check=True)
