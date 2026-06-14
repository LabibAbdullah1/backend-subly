import { z } from 'zod';

export const DeleteFileSchema = z.object({
  path: z.string().optional(),
  paths: z.array(z.string()).optional()
}).refine(data => data.path || data.paths, {
  message: 'Path atau paths file/folder wajib ditentukan.'
});
