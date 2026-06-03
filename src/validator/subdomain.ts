import { z } from 'zod';

export const CreateSubdomainSchema = z.object({
  name: z.string()
    .min(1, 'Nama subdomain wajib diisi.')
    .max(63, 'Nama subdomain maksimal 63 karakter.')
    .regex(/^[a-z0-9_-]+$/, 'Format subdomain hanya boleh huruf kecil, angka, dash (-), dan underscore (_).'),
  paymentId: z.union([z.number().int(), z.string()], {
    required_error: 'ID pembayaran wajib disertakan.'
  })
});
