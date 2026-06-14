import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getBaseDirectory, safeResolvePath, formatBytes, FileItem } from '../services/fileManagerService.js';
import { DeleteFileSchema } from '../validator/filemanager.js';
import { callCpanelApi } from '../services/cpanelService.js';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export async function listFiles(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;
  const relativePathQuery = (req.query.path as string) || '';

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    // 1. Verifikasi kepemilikan subdomain
    const subdomain = await prisma.subdomain.findFirst({
      where: {
        id: BigInt(subdomainId),
        userId: userId,
        deletedAt: null
      }
    });

    if (!subdomain) {
      return res.status(404).json({
        status: 'error',
        message: 'Subdomain tidak ditemukan atau bukan milik Anda.'
      });
    }

    // 2. Tentukan base directory
    const baseDir = getBaseDirectory(subdomain.docRoot);

    // 3. Resolve path secara aman (proteksi traversal)
    let targetDir: string;
    try {
      targetDir = safeResolvePath(baseDir, relativePathQuery);
    } catch (err: any) {
      return res.status(400).json({ status: 'error', message: err.message });
    }

    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ status: 'error', message: 'Direktori tidak ditemukan.' });
    }

    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
      return res.status(400).json({ status: 'error', message: 'Target path bukan sebuah direktori.' });
    }

    // 4. Hitung breadcrumbs
    const relPath = path.relative(baseDir, targetDir).replace(/\\/g, '/');
    const breadcrumbs: { name: string; path: string }[] = [];
    if (relPath && relPath !== '.') {
      const parts = relPath.split('/');
      let currentAcc = '';
      for (const part of parts) {
        currentAcc = currentAcc ? `${currentAcc}/${part}` : part;
        breadcrumbs.push({ name: part, path: currentAcc });
      }
    }

    // 5. Baca direktori
    const items = fs.readdirSync(targetDir);
    const folders: FileItem[] = [];
    const files: FileItem[] = [];

    for (const item of items) {
      const itemPath = path.join(targetDir, item);
      
      // Filter out system default files
      if (item === '.subly_status' || item === 'index.php.bak' || item === '.htaccess.bak') {
        continue;
      }

      if (item === 'index.php') {
        try {
          const content = fs.readFileSync(itemPath, 'utf8');
          if (content.includes('System Default Router')) {
            continue;
          }
        } catch (err) {}
      }

      if (item === '.htaccess') {
        try {
          const content = fs.readFileSync(itemPath, 'utf8');
          if (content.includes('Subly Suspended Redirect')) {
            continue;
          }
        } catch (err) {}
      }

      const itemStat = fs.statSync(itemPath);
      const itemRelPath = path.relative(baseDir, itemPath).replace(/\\/g, '/');
      const lastModified = itemStat.mtime.toUTCString();

      if (itemStat.isDirectory()) {
        folders.push({
          name: item,
          path: itemRelPath,
          is_dir: true,
          size: '-',
          last_modified: lastModified
        });
      } else {
        const ext = path.extname(item).replace(/^\./, '').toLowerCase();
        files.push({
          name: item,
          path: itemRelPath,
          is_dir: false,
          size: formatBytes(itemStat.size),
          last_modified: lastModified,
          extension: ext
        });
      }
    }

    return res.status(200).json({
      breadcrumbs,
      folders,
      files
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat menelusuri file manager.',
      error: error.message
    });
  }
}

export async function deleteFile(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  // 1. Validasi Input
  const validation = DeleteFileSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { path: relativePathToDelete, paths } = validation.data;
  const relativePaths: string[] = [];

  if (relativePathToDelete) {
    relativePaths.push(relativePathToDelete);
  }
  if (paths && Array.isArray(paths)) {
    relativePaths.push(...paths);
  }

  if (relativePaths.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Tidak ada berkas yang ditentukan untuk dihapus.' });
  }

  try {
    // 2. Verifikasi kepemilikan subdomain
    const subdomain = await prisma.subdomain.findFirst({
      where: {
        id: BigInt(subdomainId),
        userId: userId,
        deletedAt: null
      }
    });

    if (!subdomain) {
      return res.status(404).json({
        status: 'error',
        message: 'Subdomain tidak ditemukan atau bukan milik Anda.'
      });
    }

    // 3. Tentukan base directory & verifikasi semua path secara aman sebelum mulai menghapus
    const baseDir = getBaseDirectory(subdomain.docRoot);
    const resolvedPaths: string[] = [];

    for (const relPath of relativePaths) {
      let resolvedPath: string;
      try {
        resolvedPath = safeResolvePath(baseDir, relPath);
      } catch (err: any) {
        return res.status(400).json({ status: 'error', message: `Path tidak valid (${relPath}): ${err.message}` });
      }

      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ status: 'error', message: `Berkas atau folder tidak ditemukan: ${relPath}` });
      }

      // 4. Proteksi file sensitif (.env dan berkas sistem default)
      const filename = path.basename(resolvedPath);
      if (filename === '.env') {
        return res.status(403).json({
          status: 'error',
          message: `Akses ditolak. File konfigurasi sistem (${filename}) dilindungi dari penghapusan.`
        });
      }
      if (filename === '.subly_status' || filename === 'index.php.bak' || filename === '.htaccess.bak') {
        return res.status(403).json({
          status: 'error',
          message: `Akses ditolak. File sistem (${filename}) dilindungi dari penghapusan.`
        });
      }
      if (filename === 'index.php') {
        try {
          const content = fs.readFileSync(resolvedPath, 'utf8');
          if (content.includes('System Default Router')) {
            return res.status(403).json({
              status: 'error',
              message: `Akses ditolak. File sistem (${filename}) dilindungi dari penghapusan.`
            });
          }
        } catch (err) {}
      }
      if (filename === '.htaccess') {
        try {
          const content = fs.readFileSync(resolvedPath, 'utf8');
          if (content.includes('Subly Suspended Redirect')) {
            return res.status(403).json({
              status: 'error',
              message: `Akses ditolak. File sistem (${filename}) dilindungi dari penghapusan.`
            });
          }
        } catch (err) {}
      }

      resolvedPaths.push(resolvedPath);
    }

    // 5. Lakukan penghapusan secara fisik (file/folder) setelah semua divalidasi aman
    for (const resolvedPath of resolvedPaths) {
      fs.rmSync(resolvedPath, { recursive: true, force: true });
    }

    return res.status(200).json({
      success: true,
      message: 'Semua berkas atau folder terpilih berhasil dihapus secara permanen.'
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat menghapus berkas.',
      error: error.message
    });
  }
}

export async function uploadFile(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;
  const currentPath = (req.query.path as string) || (req.body.path as string) || '';

  if (!userId) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'Berkas tidak ditemukan untuk diunggah.' });
  }

  try {
    // 1. Verifikasi kepemilikan subdomain
    const subdomain = await prisma.subdomain.findFirst({
      where: {
        id: BigInt(subdomainId),
        userId: userId,
        deletedAt: null
      }
    });

    if (!subdomain) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        status: 'error',
        message: 'Subdomain tidak ditemukan atau bukan milik Anda.'
      });
    }

    // 2. Tentukan target directory
    const baseDir = getBaseDirectory(subdomain.docRoot);
    let targetDir: string;
    try {
      targetDir = safeResolvePath(baseDir, currentPath);
    } catch (err: any) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ status: 'error', message: err.message });
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const destPath = path.join(targetDir, req.file.originalname);
    fs.renameSync(req.file.path, destPath);

    return res.status(201).json({
      success: true,
      message: 'Berkas berhasil diunggah.',
      data: {
        name: req.file.originalname,
        path: currentPath ? `${currentPath}/${req.file.originalname}` : req.file.originalname
      }
    });

  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengunggah berkas.',
      error: error.message
    });
  }
}

export async function extractZip(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;
  const { path: zipRelativePath } = req.body;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  if (!zipRelativePath) {
    return res.status(400).json({ status: 'error', message: 'Path berkas ZIP wajib ditentukan.' });
  }

  try {
    // 1. Verifikasi kepemilikan subdomain
    const subdomain = await prisma.subdomain.findFirst({
      where: {
        id: BigInt(subdomainId),
        userId: userId,
        deletedAt: null
      }
    });

    if (!subdomain) {
      return res.status(404).json({
        status: 'error',
        message: 'Subdomain tidak ditemukan atau bukan milik Anda.'
      });
    }

    // 2. Tentukan target & zip file path secara aman
    const baseDir = getBaseDirectory(subdomain.docRoot);
    let resolvedZipPath: string;
    try {
      resolvedZipPath = safeResolvePath(baseDir, zipRelativePath);
    } catch (err: any) {
      return res.status(400).json({ status: 'error', message: err.message });
    }

    if (!fs.existsSync(resolvedZipPath)) {
      return res.status(404).json({ status: 'error', message: 'Berkas ZIP tidak ditemukan.' });
    }

    const targetExtractDir = path.dirname(resolvedZipPath);

    // 3. Ekstrak arsip langsung menggunakan AdmZip
    try {
      const zip = new AdmZip(resolvedZipPath);
      zip.extractAllTo(targetExtractDir, true);
    } catch (err: any) {
      return res.status(500).json({
        status: 'error',
        message: `Gagal mengekstrak berkas ZIP: ${err.message}`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Berkas ZIP berhasil diekstrak.'
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengekstrak berkas ZIP.',
      error: error.message
    });
  }
}

export async function createFileOrFolder(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;
  const { path: relativePath, type } = req.body;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  if (!relativePath) {
    return res.status(400).json({ status: 'error', message: 'Path nama berkas atau folder wajib ditentukan.' });
  }

  try {
    const subdomain = await prisma.subdomain.findFirst({
      where: { id: BigInt(subdomainId), userId, deletedAt: null }
    });

    if (!subdomain) {
      return res.status(404).json({ status: 'error', message: 'Subdomain tidak ditemukan atau bukan milik Anda.' });
    }

    const baseDir = getBaseDirectory(subdomain.docRoot);
    const resolvedPath = safeResolvePath(baseDir, relativePath);

    if (fs.existsSync(resolvedPath)) {
      return res.status(400).json({ status: 'error', message: 'Berkas atau folder dengan nama tersebut sudah ada.' });
    }

    if (type === 'folder') {
      fs.mkdirSync(resolvedPath, { recursive: true });
    } else {
      // Buat folder parent jika belum ada
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      fs.writeFileSync(resolvedPath, '');
    }

    return res.status(201).json({
      success: true,
      message: `${type === 'folder' ? 'Folder' : 'Berkas'} berhasil dibuat.`
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal membuat berkas atau folder.',
      error: error.message
    });
  }
}

export async function renameFileOrFolder(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;
  const { path: relativePath, newName } = req.body;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  if (!relativePath || !newName) {
    return res.status(400).json({ status: 'error', message: 'Path lama dan nama baru wajib ditentukan.' });
  }

  try {
    const subdomain = await prisma.subdomain.findFirst({
      where: { id: BigInt(subdomainId), userId, deletedAt: null }
    });

    if (!subdomain) {
      return res.status(404).json({ status: 'error', message: 'Subdomain tidak ditemukan atau bukan milik Anda.' });
    }

    const baseDir = getBaseDirectory(subdomain.docRoot);
    const resolvedOldPath = safeResolvePath(baseDir, relativePath);
    const resolvedNewPath = path.join(path.dirname(resolvedOldPath), newName);

    // Proteksi directory traversal pada path baru
    safeResolvePath(baseDir, path.relative(baseDir, resolvedNewPath));

    if (!fs.existsSync(resolvedOldPath)) {
      return res.status(404).json({ status: 'error', message: 'Berkas atau folder asal tidak ditemukan.' });
    }

    if (fs.existsSync(resolvedNewPath)) {
      return res.status(400).json({ status: 'error', message: 'Nama baru sudah digunakan.' });
    }

    // Proteksi berkas sistem
    const oldFilename = path.basename(resolvedOldPath);
    const systemFiles = ['.env', '.subly_status', 'index.php.bak', '.htaccess.bak'];
    if (systemFiles.includes(oldFilename) || newName === '.env') {
      return res.status(403).json({ status: 'error', message: 'Berkas sistem yang dilindungi tidak dapat diubah namanya.' });
    }

    fs.renameSync(resolvedOldPath, resolvedNewPath);

    return res.status(200).json({
      success: true,
      message: 'Berkas atau folder berhasil diubah namanya.'
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengubah nama berkas atau folder.',
      error: error.message
    });
  }
}

export async function moveFileOrFolder(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;
  const { path: relativePath, newPath } = req.body;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  if (!relativePath || !newPath) {
    return res.status(400).json({ status: 'error', message: 'Path asal dan path tujuan wajib ditentukan.' });
  }

  try {
    const subdomain = await prisma.subdomain.findFirst({
      where: { id: BigInt(subdomainId), userId, deletedAt: null }
    });

    if (!subdomain) {
      return res.status(404).json({ status: 'error', message: 'Subdomain tidak ditemukan atau bukan milik Anda.' });
    }

    const baseDir = getBaseDirectory(subdomain.docRoot);
    const resolvedOldPath = safeResolvePath(baseDir, relativePath);
    const resolvedNewPath = safeResolvePath(baseDir, newPath);

    if (!fs.existsSync(resolvedOldPath)) {
      return res.status(404).json({ status: 'error', message: 'Berkas atau folder asal tidak ditemukan.' });
    }

    if (fs.existsSync(resolvedNewPath)) {
      return res.status(400).json({ status: 'error', message: 'Tujuan pemindahan sudah ada berkas dengan nama yang sama.' });
    }

    // Proteksi berkas sistem
    const oldFilename = path.basename(resolvedOldPath);
    if (oldFilename === '.env' || oldFilename === '.subly_status') {
      return res.status(403).json({ status: 'error', message: 'Berkas sistem yang dilindungi tidak dapat dipindahkan.' });
    }

    fs.mkdirSync(path.dirname(resolvedNewPath), { recursive: true });
    fs.renameSync(resolvedOldPath, resolvedNewPath);

    return res.status(200).json({
      success: true,
      message: 'Berkas atau folder berhasil dipindahkan.'
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memindahkan berkas atau folder.',
      error: error.message
    });
  }
}

export async function getFileContent(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;
  const relativePath = req.query.path as string;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  if (!relativePath) {
    return res.status(400).json({ status: 'error', message: 'Path berkas wajib ditentukan.' });
  }

  try {
    const subdomain = await prisma.subdomain.findFirst({
      where: { id: BigInt(subdomainId), userId, deletedAt: null }
    });

    if (!subdomain) {
      return res.status(404).json({ status: 'error', message: 'Subdomain tidak ditemukan atau bukan milik Anda.' });
    }

    const baseDir = getBaseDirectory(subdomain.docRoot);
    const resolvedPath = safeResolvePath(baseDir, relativePath);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ status: 'error', message: 'Berkas tidak ditemukan.' });
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      return res.status(400).json({ status: 'error', message: 'Tidak dapat membaca isi direktori.' });
    }

    // Baca berkas teks
    const content = fs.readFileSync(resolvedPath, 'utf8');

    return res.status(200).json({
      success: true,
      content
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal membaca isi berkas.',
      error: error.message
    });
  }
}

export async function saveFileContent(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;
  const { path: relativePath, content } = req.body;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  if (!relativePath || content === undefined) {
    return res.status(400).json({ status: 'error', message: 'Path berkas dan konten wajib ditentukan.' });
  }

  try {
    const subdomain = await prisma.subdomain.findFirst({
      where: { id: BigInt(subdomainId), userId, deletedAt: null }
    });

    if (!subdomain) {
      return res.status(404).json({ status: 'error', message: 'Subdomain tidak ditemukan atau bukan milik Anda.' });
    }

    const baseDir = getBaseDirectory(subdomain.docRoot);
    const resolvedPath = safeResolvePath(baseDir, relativePath);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ status: 'error', message: 'Berkas tidak ditemukan.' });
    }

    // Proteksi penyimpanan .env jika secret atau dibatasi (opsional)
    // Untuk kemudahan, kita ijinkan menyimpan, tapi jika dia file sistem kritis, bisa divalidasi.
    fs.writeFileSync(resolvedPath, content, 'utf8');

    return res.status(200).json({
      success: true,
      message: 'Berkas berhasil disimpan.'
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menyimpan berkas.',
      error: error.message
    });
  }
}

export async function downloadFile(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;
  const relativePath = req.query.path as string;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  if (!relativePath) {
    return res.status(400).json({ status: 'error', message: 'Path berkas wajib ditentukan.' });
  }

  try {
    const subdomain = await prisma.subdomain.findFirst({
      where: { id: BigInt(subdomainId), userId, deletedAt: null }
    });

    if (!subdomain) {
      return res.status(404).json({ status: 'error', message: 'Subdomain tidak ditemukan atau bukan milik Anda.' });
    }

    const baseDir = getBaseDirectory(subdomain.docRoot);
    const resolvedPath = safeResolvePath(baseDir, relativePath);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ status: 'error', message: 'Berkas tidak ditemukan.' });
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      return res.status(400).json({ status: 'error', message: 'Tidak dapat mengunduh direktori.' });
    }

    return res.download(resolvedPath);
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengunduh berkas.',
      error: error.message
    });
  }
}

