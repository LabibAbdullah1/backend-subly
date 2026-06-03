import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { SendChatSchema } from '../validator/chat.js';
import { serializeBigInt } from '../utils/serialize.js';
import path from 'path';
import fs from 'fs';

export async function getChats(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId || !role) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    let chats;
    if (role === 'Admin') {
      const targetUserId = req.query.userId as string;
      if (!targetUserId) {
        return res.status(422).json({
          status: 'error',
          message: 'Query parameter userId wajib disertakan bagi Admin untuk memfilter pesan klien.'
        });
      }
      chats = await prisma.chat.findMany({
        where: { userId: BigInt(targetUserId) },
        orderBy: { createdAt: 'asc' }
      });
    } else {
      chats = await prisma.chat.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'asc' }
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeBigInt(chats)
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil riwayat chat.',
      error: error.message
    });
  }
}

export async function sendChat(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId || !role) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  // 1. Validasi Input Non-File
  const validation = SendChatSchema.safeParse(req.body);
  if (!validation.success) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { message, userId: bodyUserId } = validation.data;

  // Pastikan ada pesan teks ATAU file gambar terlampir
  if (!message && !req.file) {
    return res.status(422).json({
      status: 'error',
      message: 'Pesan teks atau lampiran gambar wajib dikirimkan.'
    });
  }

  try {
    // 2. Tentukan target klien
    let chatUserId: bigint;
    if (role === 'Admin') {
      if (!bodyUserId) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(422).json({
          status: 'error',
          message: 'Parameter userId target klien wajib ditentukan bagi Admin.'
        });
      }
      chatUserId = BigInt(bodyUserId);
    } else {
      chatUserId = userId;
    }

    // 3. Simpan pesan chat ke DB
    const imagePath = req.file ? `uploads/chats/${req.file.filename}` : null;

    const chat = await prisma.chat.create({
      data: {
        userId: chatUserId,
        isAdmin: role === 'Admin',
        message: message || '',
        imagePath,
        isRead: false
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Pesan berhasil dikirim.',
      data: serializeBigInt(chat)
    });

  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat mengirim pesan chat.',
      error: error.message
    });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId || !role) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    let targetUserId: bigint;
    if (role === 'Admin') {
      const uId = req.body.userId || req.query.userId;
      if (!uId) {
        return res.status(422).json({
          status: 'error',
          message: 'Parameter userId target klien wajib ditentukan untuk menandai terbaca.'
        });
      }
      targetUserId = BigInt(uId);

      // Admin membaca pesan masuk milik klien (isAdmin = false)
      await prisma.chat.updateMany({
        where: { userId: targetUserId, isAdmin: false, isRead: false },
        data: { isRead: true }
      });
    } else {
      targetUserId = userId;

      // Klien membaca pesan masuk milik admin (isAdmin = true)
      await prisma.chat.updateMany({
        where: { userId: targetUserId, isAdmin: true, isRead: false },
        data: { isRead: true }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Pesan berhasil ditandai sebagai terbaca.'
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memperbarui status baca chat.',
      error: error.message
    });
  }
}
