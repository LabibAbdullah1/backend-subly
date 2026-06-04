// src/routes/testimonialRoutes.ts
import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/authMiddleware.js';
import {
  submitTestimonial,
  getMyTestimonials,
  getPublicTestimonials,
  getAllTestimonials,
  updateTestimonialStatus,
  deleteTestimonial
} from '../controllers/testimonialController.js';

const router = Router();

// Public — tidak butuh auth
router.get('/testimonials/public', getPublicTestimonials);

// Client
router.post('/testimonials', authenticateJWT, submitTestimonial);
router.get('/testimonials/my', authenticateJWT, getMyTestimonials);

// Admin
router.get('/admin/testimonials', authenticateJWT, requireRole(['Admin']), getAllTestimonials);
router.put('/admin/testimonials/:id/status', authenticateJWT, requireRole(['Admin']), updateTestimonialStatus);
router.delete('/admin/testimonials/:id', authenticateJWT, requireRole(['Admin']), deleteTestimonial);

export default router;
