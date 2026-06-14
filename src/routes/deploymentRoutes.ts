import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import { uploadChunk, checkGitRepository, connectGit, triggerSubdomainDeploy, approveDeployment, rejectDeployment } from '../controllers/deploymentController.js';

const router = Router();

// Konfigurasi Multer untuk chunk temporary upload
const chunkTempDir = path.join(process.cwd(), 'uploads/chunks/temp');
if (!fs.existsSync(chunkTempDir)) {
  fs.mkdirSync(chunkTempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chunkTempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `chunk-${uniqueSuffix}.tmp`);
  }
});

// Izinkan format file apapun untuk chunked upload (karena tipe MIME file chunk terkompresi ZIP bervariasi)
const uploadChunkMulter = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB per chunk limit
  }
});

// Rute chunked upload (file name form field must be 'chunk')
router.post('/deployments/upload-chunk', authenticateJWT, uploadChunkMulter.single('chunk'), uploadChunk);

// Rute GitHub Integration
router.post('/subdomains/git/check-repository', authenticateJWT, checkGitRepository);
router.post('/subdomains/:id/git/connect', authenticateJWT, connectGit);
router.post('/subdomains/:id/deploy', authenticateJWT, triggerSubdomainDeploy);

// Rute Deployment Approval & Rejection (Admin Only)
router.post('/deployments/:id/approve', authenticateJWT, requireRole(['Admin']), approveDeployment);
router.post('/deployments/:id/reject', authenticateJWT, requireRole(['Admin']), rejectDeployment);

export default router;
