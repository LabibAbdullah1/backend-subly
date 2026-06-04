import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { SendChatSchema } from '../validator/chat.js';
import { serializeBigInt } from '../utils/serialize.js';
import path from 'path';
import fs from 'fs';

async function runChatAutoCleanup() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldChats = await prisma.chat.findMany({
      where: {
        createdAt: { lt: oneDayAgo }
      }
    });

    for (const chat of oldChats) {
      if (chat.imagePath) {
        const fullPath = path.join(process.cwd(), chat.imagePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (fileErr) {
            console.error('Failed to delete chat image during cleanup:', fileErr);
          }
        }
      }
    }

    await prisma.chat.deleteMany({
      where: {
        createdAt: { lt: oneDayAgo }
      }
    });
  } catch (err) {
    console.error('Chat auto-cleanup failed:', err);
  }
}

export async function getChats(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId || !role) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    await runChatAutoCleanup();

    let chats;
    if (role === 'Admin') {
      const targetUserId = req.query.userId as string;
      if (!targetUserId) {
        const chatUsers = await prisma.user.findMany({
          where: {
            chats: { some: {} },
            deletedAt: null
          },
          select: {
            id: true,
            name: true,
            email: true,
            chats: {
              orderBy: { createdAt: 'asc' }
            }
          }
        });

        const formattedUsers = chatUsers.map(u => {
          const clientChats = u.chats;
          const unreadChats = clientChats.filter(c => !c.isAdmin && !c.isRead);
          const hasUnread = unreadChats.length > 0;
          const lastChat = clientChats[clientChats.length - 1];
          return {
            id: u.id.toString(),
            name: u.name,
            email: u.email,
            hasUnread,
            unreadCount: unreadChats.length,
            lastMessage: lastChat?.message || '',
            lastMessageAt: lastChat?.createdAt || null,
            oldestUnreadAt: unreadChats[0]?.createdAt || null
          };
        });

        formattedUsers.sort((a, b) => {
          if (a.hasUnread && !b.hasUnread) return -1;
          if (!a.hasUnread && b.hasUnread) return 1;
          if (a.hasUnread && b.hasUnread) {
            return new Date(a.oldestUnreadAt!).getTime() - new Date(b.oldestUnreadAt!).getTime();
          }
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });

        return res.status(200).json({
          success: true,
          data: formattedUsers
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
    await runChatAutoCleanup();

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

    // Auto-respons jika pengirim adalah client (dibatasi 1 jam sekali agar tidak spam)
    if (role !== 'Admin') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentAutoResponse = await prisma.chat.findFirst({
        where: {
          userId: chatUserId,
          isAdmin: true,
          message: 'Halo! Terimakasih telah menghubungi kami. Pesan Anda telah diterima. Admin Subly akan segera membalas pesan Anda.',
          createdAt: { gte: oneHourAgo }
        }
      });

      if (!recentAutoResponse) {
        await prisma.chat.create({
          data: {
            userId: chatUserId,
            isAdmin: true,
            message: 'Halo! Terimakasih telah menghubungi kami. Pesan Anda telah diterima. Admin Subly akan segera membalas pesan Anda.',
            isRead: false
          }
        });
      }
    }

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

export async function deleteChat(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const role = req.user?.role;
  const chatId = req.params.id;

  if (!userId || !role) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: BigInt(chatId) }
    });

    if (!chat) {
      return res.status(404).json({ status: 'error', message: 'Pesan tidak ditemukan.' });
    }

    // Klien hanya bisa menghapus pesan miliknya (isAdmin = false dan miliknya)
    // Admin hanya bisa menghapus pesan miliknya (isAdmin = true)
    const isOwnMessage = role === 'Admin' ? chat.isAdmin : (!chat.isAdmin && chat.userId === userId);

    if (!isOwnMessage) {
      return res.status(403).json({ status: 'error', message: 'Anda tidak memiliki hak untuk menghapus pesan ini.' });
    }

    // Hapus file lampiran jika ada
    if (chat.imagePath) {
      const fullPath = path.join(process.cwd(), chat.imagePath);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (fileErr) {
          console.error('Failed to delete chat image file:', fileErr);
        }
      }
    }

    await prisma.chat.delete({
      where: { id: chat.id }
    });

    return res.status(200).json({
      success: true,
      message: 'Pesan berhasil dihapus.'
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menghapus pesan chat.',
      error: error.message
    });
  }
}
