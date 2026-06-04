import { z } from 'zod';

export const CreateNotificationSchema = z.object({
  userId: z.string().optional().nullable(), // Nullable/Optional means broadcast to all
  title: z.string().min(3, 'Judul notifikasi minimal 3 karakter.').max(255),
  message: z.string().min(5, 'Isi notifikasi minimal 5 karakter.')
});
