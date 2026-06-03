import { z } from 'zod';

export const UploadChunkSchema = z.object({
  subdomainId: z.string().or(z.number()).transform((val) => val.toString()),
  uploadId: z.string().regex(/^[A-Za-z0-9_\-]+$/),
  chunkIndex: z.string().or(z.number()).transform((val) => parseInt(val.toString(), 10)),
  totalChunks: z.string().or(z.number()).transform((val) => parseInt(val.toString(), 10)),
  fileName: z.string().min(1),
  notes: z.string().max(255).optional().nullable()
});

export const ConnectGitSchema = z.object({
  git_url: z.string().url('Format URL repositori tidak valid.'),
  git_branch: z.string().min(1, 'Nama branch wajib diisi.').max(100),
  git_token: z.string().max(255).optional().nullable()
});

export const CheckGitRepoSchema = z.object({
  git_url: z.string().url('Format URL repositori tidak valid.'),
  git_token: z.string().max(255).optional().nullable()
});

export const UpdateEnvSchema = z.object({
  keys: z.array(z.string().regex(/^[A-Z_][A-Z0-9_]*$/i, 'Format Key env tidak valid.').max(255)),
  values: z.array(z.string().max(1000)),
  secrets: z.array(z.boolean().or(z.string().transform((val) => val === 'true')))
});

export const UpdateEnvRawSchema = z.object({
  raw_env: z.string().max(10000)
});
