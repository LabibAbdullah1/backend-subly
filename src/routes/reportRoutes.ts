import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import { createReport, getReports, getReportDetails, updateReportStatus } from '../controllers/reportController.js';

const router = Router();

router.post('/reports', authenticateJWT, requireRole(['Client']), createReport);
router.get('/reports', authenticateJWT, getReports);
router.get('/reports/:id', authenticateJWT, getReportDetails);
router.post('/reports/:id/status', authenticateJWT, requireRole(['Admin']), updateReportStatus);

export default router;
