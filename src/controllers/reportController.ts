import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { CreateReportSchema, UpdateReportStatusSchema } from '../validator/report.js';
import { serializeBigInt } from '../utils/serialize.js';

export async function createReport(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  // 1. Validasi Input
  const validation = CreateReportSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { subject, message } = validation.data;

  try {
    // 2. Buat Tiket Baru
    const report = await prisma.report.create({
      data: {
        userId,
        subject,
        message,
        status: 'open'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Tiket bantuan berhasil dibuat.',
      data: serializeBigInt(report)
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat membuat tiket bantuan.',
      error: error.message
    });
  }
}

export async function getReports(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId || !role) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    // 1. Ambil tiket berdasarkan peran
    let reports;
    if (role === 'Admin') {
      reports = await prisma.report.findMany({
        where: { deletedAt: null },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      reports = await prisma.report.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' }
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeBigInt(reports)
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil daftar tiket bantuan.',
      error: error.message
    });
  }
}

export async function getReportDetails(req: AuthenticatedRequest, res: Response) {
  const reportId = req.params.id;
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId || !role) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    // 1. Ambil tiket detail
    const report = await prisma.report.findFirst({
      where: { id: BigInt(reportId), deletedAt: null },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    if (!report) {
      return res.status(404).json({ status: 'error', message: 'Tiket bantuan tidak ditemukan.' });
    }

    // Klien hanya boleh melihat tiket miliknya sendiri
    if (role !== 'Admin' && report.userId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Akses dilarang.' });
    }

    return res.status(200).json({
      success: true,
      data: serializeBigInt(report)
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil detail tiket bantuan.',
      error: error.message
    });
  }
}

export async function updateReportStatus(req: AuthenticatedRequest, res: Response) {
  const reportId = req.params.id;
  const role = req.user?.role;

  if (role !== 'Admin') {
    return res.status(403).json({ status: 'error', message: 'Hanya admin yang dapat memperbarui status tiket.' });
  }

  // 1. Validasi Input
  const validation = UpdateReportStatusSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { status } = validation.data;

  try {
    // 2. Perbarui status
    const updated = await prisma.report.update({
      where: { id: BigInt(reportId) },
      data: { status }
    });

    return res.status(200).json({
      success: true,
      message: `Status tiket bantuan berhasil diperbarui menjadi ${status}.`,
      data: serializeBigInt(updated)
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memperbarui status tiket bantuan.',
      error: error.message
    });
  }
}
