import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { listFiles, deleteFile, uploadFile, extractZip } from '../controllers/fileManagerController.js';

const router = Router();

// Konfigurasi Multer untuk upload cPanel File Manager
const uploadTempDir = path.join(process.cwd(), 'uploads/temp/filemanager');
if (!fs.existsSync(uploadTempDir)) {
  fs.mkdirSync(uploadTempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadTempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // Batas ukuran berkas 50 MB
  }
});

router.get('/subdomains/:id/file-manager', authenticateJWT, listFiles);
router.delete('/subdomains/:id/file-manager', authenticateJWT, deleteFile);
router.post('/subdomains/:id/file-manager/upload', authenticateJWT, upload.single('file'), uploadFile);
router.post('/subdomains/:id/file-manager/extract', authenticateJWT, extractZip);

export default router;
