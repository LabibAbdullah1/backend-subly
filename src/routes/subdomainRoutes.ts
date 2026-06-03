import { Router } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { claimSubdomain, getSubdomainDiskUsage } from '../controllers/subdomainController.js';

const router = Router();

router.post('/subdomains', authenticateJWT, claimSubdomain);
router.get('/subdomains/:id/disk-usage', authenticateJWT, getSubdomainDiskUsage);

export default router;
