import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import {
  getActivePlans,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan
} from '../controllers/planController.js';

const router = Router();

router.get('/plans', getActivePlans); // Public/Client listing
router.get('/plans/all', authenticateJWT, requireRole(['Admin']), getAllPlans);
router.post('/plans', authenticateJWT, requireRole(['Admin']), createPlan);
router.put('/plans/:id', authenticateJWT, requireRole(['Admin']), updatePlan);
router.delete('/plans/:id', authenticateJWT, requireRole(['Admin']), deletePlan);

export default router;
