import path from 'path';
import fs from 'fs';

export function getBaseDirectory(docRoot: string): string {
  if (process.platform === 'win32') {
    const match = docRoot.match(/\/home\/[^/]+\/client\/([^/]+)(.*)/);
    if (match) {
      const subdomain = match[1];
      const subPath = match[2];
      const localPath = path.join(process.cwd(), 'uploads/client', subdomain, subPath);
      if (!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, { recursive: true });
      }
      return localPath;
    }
    const fallbackPath = path.join(process.cwd(), 'uploads/client', path.basename(docRoot));
    if (!fs.existsSync(fallbackPath)) {
      fs.mkdirSync(fallbackPath, { recursive: true });
    }
    return fallbackPath;
  }
  return docRoot;
}

export function safeResolvePath(baseDir: string, relativePath: string): string {
  // Ganti backslash ke slash jika dari Windows client request
  const cleanRelative = (relativePath || '').replace(/\\/g, '/');
  
  // Normalisasi path gabungan
  const resolvedPath = path.resolve(baseDir, cleanRelative);
  const normalizedBase = path.resolve(baseDir);

  // Proteksi Directory Traversal
  if (!resolvedPath.startsWith(normalizedBase)) {
    throw new Error('Directory Traversal: Akses di luar batas direktori root tidak diizinkan.');
  }

  return resolvedPath;
}

export interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: string;
  last_modified: string;
  extension?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
