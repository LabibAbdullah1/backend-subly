import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { getBaseDirectory, safeResolvePath, formatBytes, FileItem } from '../services/fileManagerService.js';
import { DeleteFileSchema } from '../validator/filemanager.js';
import fs from 'fs';
import path from 'path';

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

  const { path: relativePathToDelete } = validation.data;

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

    // 3. Tentukan base directory & resolve path secara aman
    const baseDir = getBaseDirectory(subdomain.docRoot);
    let resolvedPath: string;
    try {
      resolvedPath = safeResolvePath(baseDir, relativePathToDelete);
    } catch (err: any) {
      return res.status(400).json({ status: 'error', message: err.message });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ status: 'error', message: 'Berkas atau folder tidak ditemukan.' });
    }

    // 4. Proteksi file sensitif (.env dan .htaccess)
    const filename = path.basename(resolvedPath);
    if (filename === '.env' || filename === '.htaccess') {
      return res.status(403).json({
        status: 'error',
        message: 'Akses ditolak. File konfigurasi sistem (.env / .htaccess) dilindungi dari penghapusan.'
      });
    }

    // 5. Lakukan penghapusan secara fisik (file/folder)
    fs.rmSync(resolvedPath, { recursive: true, force: true });

    return res.status(200).json({
      success: true,
      message: 'Berkas atau folder berhasil dihapus secara permanen.'
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat menghapus file manager.',
      error: error.message
    });
  }
}
