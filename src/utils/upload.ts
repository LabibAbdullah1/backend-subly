import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getUploadsPath } from './path.js';

// Pastikan direktori uploads/proofs/ ada
const uploadDir = getUploadsPath('proofs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `proof-${uniqueSuffix}${ext}`);
  }
});

// File Filter untuk membatasi tipe berkas
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Hanya gambar (JPG, JPEG, PNG, WEBP) yang diperbolehkan.'), false);
  }
};

// Batasan ukuran berkas (2MB)
const limits = {
  fileSize: 2 * 1024 * 1024 // 2 MB
};

export const uploadProof = multer({
  storage,
  fileFilter,
  limits
});
