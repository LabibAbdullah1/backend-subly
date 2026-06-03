import { z } from 'zod';

export const CreateReportSchema = z.object({
  subject: z.string().min(3, 'Subjek minimal 3 karakter.').max(255),
  message: z.string().min(5, 'Deskripsi kendala minimal 5 karakter.')
});

export const UpdateReportStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved'])
});
