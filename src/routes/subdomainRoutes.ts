import { Router } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { claimSubdomain } from '../controllers/subdomainController.js';

const router = Router();

router.post('/subdomains', authenticateJWT, claimSubdomain);

export default router;
