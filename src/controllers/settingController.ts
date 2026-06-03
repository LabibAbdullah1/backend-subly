import { Request, Response } from 'express';
import prisma from '../config/db.js';

export async function getSettings(req: Request, res: Response) {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string | null>);
    
    return res.status(200).json({ success: true, data: settingsMap });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil settings.',
      error: error.message
    });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const keys = Object.keys(req.body);
    
    await prisma.$transaction(async (tx) => {
      for (const key of keys) {
        const value = req.body[key];
        await tx.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        });
      }

      if (req.file) {
        const qrisImagePath = `uploads/settings/${req.file.filename}`;
        await tx.setting.upsert({
          where: { key: 'qris_image_path' },
          update: { value: qrisImagePath },
          create: { key: 'qris_image_path', value: qrisImagePath }
        });
      }
    });

    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string | null>);

    return res.status(200).json({
      success: true,
      message: 'Pengaturan berhasil diperbarui.',
      data: settingsMap
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memperbarui pengaturan.',
      error: error.message
    });
  }
}
