import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { CreateNotificationSchema } from '../validator/notification.js';
import { serializeBigInt } from '../utils/serialize.js';

export async function createNotification(req: AuthenticatedRequest, res: Response) {
  const role = req.user?.role;
  if (role !== 'Admin') {
    return res.status(403).json({ status: 'error', message: 'Hanya admin yang dapat membuat notifikasi.' });
  }

  const validation = CreateNotificationSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { userId, title, message } = validation.data;

  try {
    const notification = await prisma.notification.create({
      data: {
        userId: userId ? BigInt(userId) : null,
        title,
        message,
        isRead: false
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Notifikasi berhasil dibuat.',
      data: serializeBigInt(notification)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat membuat notifikasi.',
      error: error.message
    });
  }
}

export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId || !role) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    let notifications;
    if (role === 'Admin') {
      // Admin sees all notifications sent
      notifications = await prisma.notification.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Client sees global notifications (userId IS NULL) or their own targeted notifications
      notifications = await prisma.notification.findMany({
        where: {
          OR: [
            { userId: null },
            { userId }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeBigInt(notifications)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil daftar notifikasi.',
      error: error.message
    });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  const notificationId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    // If client, check ownership or if it's a broadcast
    const notif = await prisma.notification.findUnique({
      where: { id: BigInt(notificationId) }
    });

    if (!notif) {
      return res.status(404).json({ status: 'error', message: 'Notifikasi tidak ditemukan.' });
    }

    if (notif.userId && notif.userId !== userId && req.user?.role !== 'Admin') {
      return res.status(403).json({ status: 'error', message: 'Akses dilarang.' });
    }

    const updated = await prisma.notification.update({
      where: { id: BigInt(notificationId) },
      data: { isRead: true }
    });

    return res.status(200).json({
      success: true,
      data: serializeBigInt(updated)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memperbarui notifikasi.',
      error: error.message
    });
  }
}

export async function deleteNotification(req: AuthenticatedRequest, res: Response) {
  const notificationId = req.params.id;
  const role = req.user?.role;

  if (role !== 'Admin') {
    return res.status(403).json({ status: 'error', message: 'Hanya admin yang dapat menghapus notifikasi.' });
  }

  try {
    await prisma.notification.delete({
      where: { id: BigInt(notificationId) }
    });

    return res.status(200).json({
      success: true,
      message: 'Notifikasi berhasil dihapus.'
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat menghapus notifikasi.',
      error: error.message
    });
  }
}
