import { Router } from 'express';
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { streamNodejsLogs, getRecentLogs } from '../controllers/logController.js';

const router = Router();

// SSE real-time stream — koneksi persisten, log mengalir tiap 3s
router.get('/subdomains/:id/logs/stream', authenticateJWT, streamNodejsLogs);

// REST snapshot — ambil last N lines sekali saja
router.get('/subdomains/:id/logs/recent', authenticateJWT, getRecentLogs);

export default router;
