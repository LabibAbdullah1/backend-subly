import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { cleanupExpiredSubdomains } from '../services/cronService.js';

export async function triggerExpiredSubdomainsCleanup(req: AuthenticatedRequest, res: Response) {
  // Hanya admin yang bisa memicu
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak. Hanya Administrator yang dapat menjalankan proses ini.' });
  }

  try {
    const result = await cleanupExpiredSubdomains();
    return res.status(200).json({
      success: true,
      message: `Proses penangguhan subdomain kedaluwarsa selesai.`,
      suspendedCount: result.suspendedCount,
      errors: result.errors
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menjalankan cron penangguhan subdomain.',
      error: err.message
    });
  }
}
