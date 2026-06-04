import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import { createNotification, getNotifications, markAsRead, deleteNotification } from '../controllers/notificationController.js';

const router = Router();

router.post('/notifications', authenticateJWT, requireRole(['Admin']), createNotification);
router.get('/notifications', authenticateJWT, getNotifications);
router.post('/notifications/:id/read', authenticateJWT, markAsRead);
router.delete('/notifications/:id', authenticateJWT, requireRole(['Admin']), deleteNotification);

export default router;
