import { z } from 'zod';

export const SendChatSchema = z.object({
  message: z.string().max(5000).optional().nullable(),
  userId: z.string().or(z.number()).transform((val) => val.toString()).optional().nullable()
});
