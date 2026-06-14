import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { UploadChunkSchema, ConnectGitSchema, CheckGitRepoSchema } from '../validator/deployment.js';
import { validateAndDeployZip, getGithubBranches, deployFromGit } from '../services/deploymentService.js';
import { encryptString, decryptString } from '../utils/crypto.js';
import { serializeBigInt } from '../utils/serialize.js';
import path from 'path';
import fs from 'fs';

export async function uploadChunk(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  // 1. Validasi Payload (Non-File)
  const validation = UploadChunkSchema.safeParse(req.body);
  if (!validation.success) {
    // Bersihkan file yang terupload jika ada error validasi payload
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { subdomainId, uploadId, chunkIndex, totalChunks, fileName, notes } = validation.data;

  // Pastikan file chunk diunggah
  if (!req.file) {
    return res.status(422).json({ status: 'error', message: 'Berkas chunk tidak ditemukan.' });
  }

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
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        status: 'error',
        message: 'Subdomain tidak ditemukan atau bukan milik Anda.'
      });
    }

    // 3. Pindahkan chunk ke folder khusus uploadId
    const chunkDir = path.join(process.cwd(), 'uploads/chunks', uploadId);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }

    const chunkPath = path.join(chunkDir, `chunk-${chunkIndex}`);
    fs.renameSync(req.file.path, chunkPath);

    console.log(`[Upload Chunk] Subdomain: ${subdomain.name}, Upload ID: ${uploadId}, Chunk: ${chunkIndex}/${totalChunks - 1}`);

    // 4. Jika bukan chunk terakhir, respon sukses 200
    if (chunkIndex < totalChunks - 1) {
      return res.status(200).json({ success: true, message: 'Chunk uploaded' });
    }

    // 5. CHUNK TERAKHIR: Lakukan penggabungan semua chunk secara sekuensial
    const destDir = path.join(process.cwd(), 'uploads/deployments');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const mergedZipPath = path.join(destDir, `${subdomainId}-${Date.now()}-${fileName}`);
    const writeStream = fs.createWriteStream(mergedZipPath);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const singleChunkPath = path.join(chunkDir, `chunk-${i}`);
        if (!fs.existsSync(singleChunkPath)) {
          throw new Error(`File chunk indeks ${i} tidak lengkap di server.`);
        }
        const dataBuffer = fs.readFileSync(singleChunkPath);
        writeStream.write(dataBuffer);
      }
      writeStream.end();
    } catch (err: any) {
      writeStream.destroy();
      throw err;
    }

    // Tunggu write stream selesai ditulis
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    });

    // Hapus folder chunk temporary
    fs.rmSync(chunkDir, { recursive: true, force: true });

    // 6. Jalankan validasi & deployment file ZIP yang sudah lengkap
    const deployment = await validateAndDeployZip({
      subdomainId: subdomain.id,
      zipFilePath: mergedZipPath,
      notes
    });

    // Bersihkan file ZIP utama setelah diekstrak di server
    if (fs.existsSync(mergedZipPath)) {
      fs.unlinkSync(mergedZipPath);
    }

    return res.status(201).json({
      success: true,
      message: 'Upload complete and validated.',
      data: serializeBigInt(deployment)
    });

  } catch (error: any) {
    // Bersihkan file chunk yang baru terupload jika error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memproses chunked upload.',
      error: error.message
    });
  }
}

export async function checkGitRepository(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  // Validasi Input
  const validation = CheckGitRepoSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { git_url, git_token } = validation.data;

  try {
    const branches = await getGithubBranches(git_url, git_token);
    return res.status(200).json({
      success: true,
      branches
    });
  } catch (error: any) {
    return res.status(422).json({
      status: 'error',
      message: error.message
    });
  }
}

export async function connectGit(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  // Validasi Input
  const validation = ConnectGitSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { git_url, git_branch, git_token } = validation.data;

  try {
    // 1. Verifikasi kepemilikan subdomain
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

    // 2. Hubungkan Git dan simpan detailnya di DB (Enkripsi token jika disediakan)
    const encryptedToken = git_token ? encryptString(git_token) : null;

    const updatedSubdomain = await prisma.subdomain.update({
      where: { id: subdomain.id },
      data: {
        gitUrl: git_url,
        gitBranch: git_branch,
        gitToken: encryptedToken,
        gitConnectedAt: new Date()
      }
    });

    // 3. Pemicu deployment awal dari Git
    const deployment = await deployFromGit({
      subdomainId: subdomain.id,
      gitUrl: git_url,
      branch: git_branch,
      token: git_token,
      notes: `Initial Deploy from Connected Git - Branch: ${git_branch}`
    });

    return res.status(200).json({
      success: true,
      message: 'Repositori berhasil terhubung dan deploy sukses.',
      data: serializeBigInt({
        subdomain: updatedSubdomain,
        deployment
      })
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat menghubungkan Git repositori.',
      error: error.message
    });
  }
}

export async function triggerSubdomainDeploy(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
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

    if (!subdomain.gitUrl) {
      const lastDeployment = await prisma.deployment.findFirst({
        where: { subdomainId: subdomain.id },
        orderBy: { version: 'desc' }
      });

      const nextVersion = lastDeployment ? lastDeployment.version + 1 : 1;
      const deployment = await prisma.deployment.create({
        data: {
          subdomainId: subdomain.id,
          zipPath: lastDeployment?.zipPath || 'manual_trigger',
          zipSize: lastDeployment?.zipSize || BigInt(0),
          extractedSize: lastDeployment?.extractedSize || BigInt(0),
          version: nextVersion,
          status: 'queued', // Menunggu persetujuan admin
          notes: `Manual Redeploy (ZIP) v${nextVersion}`,
          deployedAt: null // Di-set ketika disetujui oleh admin
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Redeploy manual berhasil diajukan dan menunggu persetujuan.',
        data: serializeBigInt(deployment)
      });
    }

    const decryptedToken = subdomain.gitToken ? decryptString(subdomain.gitToken) : null;
    const deployment = await deployFromGit({
      subdomainId: subdomain.id,
      gitUrl: subdomain.gitUrl,
      branch: subdomain.gitBranch || 'main',
      token: decryptedToken,
      notes: `Manual Git Redeploy - Branch: ${subdomain.gitBranch}`
    });

    return res.status(200).json({
      success: true,
      message: 'Redeploy manual dari Git berhasil diajukan dan menunggu persetujuan.',
      data: serializeBigInt(deployment)
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal melakukan redeploy manual.',
      error: error.message
    });
  }
}

export async function approveDeployment(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { adminNote } = req.body;

  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: BigInt(id) },
      include: { subdomain: true }
    });

    if (!deployment) {
      return res.status(404).json({ status: 'error', message: 'Deployment tidak ditemukan.' });
    }

    const updatedDeployment = await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        status: 'success',
        adminNote: adminNote || null,
        deployedAt: new Date()
      }
    });

    // Update status subdomain menjadi active dan perpanjang masa aktif jika free plan
    const lastPayment = await prisma.payment.findFirst({
      where: { subdomainId: deployment.subdomainId, status: 'success', deletedAt: null },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
    });

    if (lastPayment) {
      const plan = lastPayment.plan;
      const isFreePlan = plan.price === BigInt(0);
      const updateData: any = { status: 'active' };

      if (isFreePlan) {
        updateData.expiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 Hari
      }

      await prisma.subdomain.update({
        where: { id: deployment.subdomainId },
        data: updateData
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Deployment berhasil disetujui.',
      data: serializeBigInt(updatedDeployment)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menyetujui deployment.',
      error: error.message
    });
  }
}

export async function rejectDeployment(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { adminNote } = req.body;

  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: BigInt(id) }
    });

    if (!deployment) {
      return res.status(404).json({ status: 'error', message: 'Deployment tidak ditemukan.' });
    }

    const updatedDeployment = await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        status: 'error',
        adminNote: adminNote || 'Ditolak oleh Admin.'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Deployment berhasil ditolak.',
      data: serializeBigInt(updatedDeployment)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menolak deployment.',
      error: error.message
    });
  }
}


