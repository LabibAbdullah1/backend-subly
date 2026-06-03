import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { UpdateEnvSchema, UpdateEnvRawSchema } from '../validator/deployment.js';
import { writeEnvFiles } from '../services/envService.js';

export async function updateEnv(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  // 1. Validasi Input
  const validation = UpdateEnvSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { keys, values, secrets } = validation.data;

  try {
    // 2. Verifikasi kepemilikan subdomain
    const subdomain = await prisma.subdomain.findFirst({
      where: {
        id: BigInt(subdomainId),
        userId: userId,
        deletedAt: null
      }
    });

    if (!subdomain) {
      return res.status(404).json({
        status: 'error',
        message: 'Subdomain tidak ditemukan atau bukan milik Anda.'
      });
    }

    // 3. Update database di transaction block
    await prisma.$transaction(async (tx) => {
      // Hapus data env lama
      await tx.subdomainEnv.deleteMany({
        where: { subdomainId: subdomain.id }
      });

      // Insert data env baru
      if (keys.length > 0) {
        const createData = keys.map((key, i) => ({
          subdomainId: subdomain.id,
          key: key.trim(),
          value: values[i] || '',
          isSecret: secrets[i] === true
        }));

        await tx.subdomainEnv.createMany({
          data: createData
        });
      }
    });

    // 4. Sinkronisasikan perubahan ke file fisik (.env)
    await writeEnvFiles(subdomain.id, subdomain.docRoot);

    return res.status(200).json({
      success: true,
      message: 'Variabel lingkungan disinkronkan ke server.'
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memperbarui variabel lingkungan.',
      error: error.message
    });
  }
}

export async function updateEnvRaw(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  // 1. Validasi Input
  const validation = UpdateEnvRawSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { raw_env } = validation.data;

  try {
    // 2. Verifikasi kepemilikan subdomain
    const subdomain = await prisma.subdomain.findFirst({
      where: {
        id: BigInt(subdomainId),
        userId: userId,
        deletedAt: null
      }
    });

    if (!subdomain) {
      return res.status(404).json({
        status: 'error',
        message: 'Subdomain tidak ditemukan atau bukan milik Anda.'
      });
    }

    // 3. Parsing raw_env string
    const lines = raw_env.split(/\r?\n/);
    const parsedEnvs: { key: string; value: string; isSecret: boolean }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Lewati baris kosong atau komentar
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) {
        continue; // abaikan baris yang tidak berformat key=value
      }

      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      // Hapus tanda kutip luar jika ada (e.g. "myvalue" atau 'myvalue')
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
      }

      // Validasi penamaan key env
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
        continue; // skip key tidak valid
      }

      parsedEnvs.push({
        key,
        value,
        isSecret: true // default raw env ditandai sebagai secret demi keamanan
      });
    }

    // 4. Update database di transaction block
    await prisma.$transaction(async (tx) => {
      // Hapus data env lama
      await tx.subdomainEnv.deleteMany({
        where: { subdomainId: subdomain.id }
      });

      // Insert data env baru
      if (parsedEnvs.length > 0) {
        const createData = parsedEnvs.map((env) => ({
          subdomainId: subdomain.id,
          key: env.key,
          value: env.value,
          isSecret: env.isSecret
        }));

        await tx.subdomainEnv.createMany({
          data: createData
        });
      }
    });

    // 5. Sinkronisasikan perubahan ke file fisik (.env)
    await writeEnvFiles(subdomain.id, subdomain.docRoot);

    return res.status(200).json({
      success: true,
      message: 'Raw .env berhasil diparsing dan disimpan ke server.'
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memproses raw env.',
      error: error.message
    });
  }
}
