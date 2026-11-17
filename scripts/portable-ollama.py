"""Inspect/extract the official Windows CPU runtime using standard HTTP byte ranges.
GPU libraries are optional on this Intel CPU laptop. No installer or system account changes.
"""
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

URL = 'https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.zip'
class RemoteZip(io.RawIOBase):
    def __init__(self):
        with urllib.request.urlopen(urllib.request.Request(URL, method='HEAD'), timeout=60) as response:
            self.url = response.url
            self.size = int(response.headers['Content-Length'])
        self.position = 0
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.position
    def seek(self, offset, whence=0):
        self.position = offset if whence == 0 else self.position + offset if whence == 1 else self.size + offset
        return self.position
    def read(self, size=-1):
        if size < 0: size = self.size - self.position
        size = min(size, self.size - self.position)
        if size <= 0: return b''
        request = urllib.request.Request(self.url, headers={'Range': f'bytes={self.position}-{self.position+size-1}'})
        with urllib.request.urlopen(request, timeout=180) as response:
            if response.status != 206:
                raise RuntimeError('This host does not support byte-range extraction. Use the official installer instead.')
            data = response.read(size)
        self.position += len(data)
        return data

root = Path('.runtime/ollama-cpu').resolve()
with zipfile.ZipFile(RemoteZip()) as archive:
    files = archive.infolist()
    if '--install' not in sys.argv:
        print(json.dumps([{'name': f.filename, 'size': f.file_size} for f in files], indent=2))
    else:
        selected = [f for f in files if not f.is_dir() and (f.filename.lower().endswith('ollama.exe') or ('lib/ollama/' in f.filename.lower().replace('\\', '/') and not any(gpu in f.filename.lower() for gpu in ['cuda', 'rocm', 'vulkan', 'mlx'])))]
        for file in selected:
            target = (root / file.filename).resolve()
            if root not in target.parents: raise RuntimeError('Unsafe archive path')
            if target.exists() and target.stat().st_size == file.file_size:
                print('Already downloaded:', file.filename, flush=True); continue
            print('Downloading official CPU runtime:', file.filename, file.file_size, flush=True)
            target.parent.mkdir(parents=True, exist_ok=True)
            data = archive.read(file)  # ZipFile verifies the entry CRC before returning bytes.
            target.write_bytes(data)
        print('Portable Ollama CPU runtime prepared.', flush=True)
