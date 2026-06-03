import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import { claimSubdomain, getSubdomainDiskUsage, getUserSubdomains, deleteSubdomain, getAdminStats, updateStorageOverride } from '../controllers/subdomainController.js';

const router = Router();

router.post('/subdomains', authenticateJWT, claimSubdomain);
router.get('/subdomains', authenticateJWT, getUserSubdomains);
router.get('/subdomains/:id/disk-usage', authenticateJWT, getSubdomainDiskUsage);
router.delete('/subdomains/:id', authenticateJWT, deleteSubdomain);
router.get('/admin/stats', authenticateJWT, requireRole(['Admin']), getAdminStats);
router.put('/subdomains/:id/storage-override', authenticateJWT, requireRole(['Admin']), updateStorageOverride);

export default router;
