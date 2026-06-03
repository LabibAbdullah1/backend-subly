import { z } from 'zod';

export const DeleteFileSchema = z.object({
  path: z.string().min(1, 'Path file/folder wajib ditentukan.')
});
