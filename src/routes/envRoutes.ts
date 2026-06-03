import { Router } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { updateEnv, updateEnvRaw } from '../controllers/envController.js';

const router = Router();

router.post('/subdomains/:id/env/update', authenticateJWT, updateEnv);
router.post('/subdomains/:id/env/update-raw', authenticateJWT, updateEnvRaw);

export default router;
