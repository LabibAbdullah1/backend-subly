import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { CreateSubdomainSchema } from '../validator/subdomain.js';
import { provisionSubdomain } from '../services/provisioningService.js';
import { encryptString, decryptString } from '../utils/crypto.js';
import { serializeBigInt } from '../utils/serialize.js';
import { getBaseDirectory, getDirectorySize } from '../services/fileManagerService.js';
import dotenv from 'dotenv';

dotenv.config();

const ROOT_DOMAIN = process.env.CPANEL_ROOT_DOMAIN || 'subly.my.id';
const CPANEL_USER = process.env.CPANEL_USER || 'sublymyi';

function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomPassword(length: number): string {
  // Gunakan karakter aman untuk password MySQL
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function claimSubdomain(req: AuthenticatedRequest, res: Response) {
  const validation = CreateSubdomainSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { name, paymentId } = validation.data;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    // 1. Cari & Verifikasi transaksi pembayaran sukses milik user
    const payment = await prisma.payment.findFirst({
      where: {
        id: BigInt(paymentId),
        userId: userId,
        status: 'success',
        deletedAt: null
      },
      include: {
        plan: true
      }
    });

    if (!payment) {
      return res.status(422).json({
        status: 'error',
        message: 'Slot pembayaran tidak ditemukan, belum lunas, atau bukan milik Anda.'
      });
    }

    if (payment.subdomainId !== null) {
      return res.status(422).json({
        status: 'error',
        message: 'Slot transaksi pembayaran ini sudah digunakan untuk subdomain lain.'
      });
    }

    // 2. Cek apakah nama subdomain sudah terpakai
    const existingSubdomain = await prisma.subdomain.findFirst({
      where: {
        name: name,
        deletedAt: null
      }
    });

    if (existingSubdomain) {
      return res.status(422).json({
        status: 'error',
        message: 'Nama subdomain tersebut sudah digunakan oleh pengguna lain.'
      });
    }

    // 3. Siapkan parameter konfigurasi subdomain & database
    const fullDomain = `${name}.${ROOT_DOMAIN}`;
    const docRoot = `/home/${CPANEL_USER}/client/${name}`;
    
    // Generate nama DB & User unik (format cPanel: prefix_suffix)
    const dbName = `${CPANEL_USER}_${generateRandomString(8)}`;
    const dbUser = `${CPANEL_USER}_${generateRandomString(7)}`; // batas user cPanel max 16 karakter
    const dbPassPlain = generateRandomPassword(16);
    
    // Enkripsi password database sebelum disimpan ke DB (Laravel compatible)
    const dbPasswordEncrypted = encryptString(dbPassPlain);

    // Hitung masa aktif subdomain berdasarkan tanggal transaksi pembayaran dan durasi paket
    const expiredAt = new Date(payment.createdAt || new Date());
    expiredAt.setMonth(expiredAt.getMonth() + payment.plan.durationMonths);

    // 4. Lakukan operasi database di transaction block agar aman
    const result = await prisma.$transaction(async (tx) => {
      // a. Buat entri subdomain baru
      const newSubdomain = await tx.subdomain.create({
        data: {
          userId,
          name,
          fullDomain,
          docRoot,
          status: 'active',
          expiredAt,
          nodejsVersion: '20',
          nodejsStartupFile: 'server.js',
          nodejsMode: 'production'
        }
      });

      // b. Buat kredensial database untuk subdomain tersebut
      const userDatabase = await tx.userDatabase.create({
        data: {
          subdomainId: newSubdomain.id,
          dbName,
          dbUser,
          dbPassword: dbPasswordEncrypted
        }
      });

      // c. Hubungkan transaksi pembayaran ke subdomain ini
      await tx.payment.update({
        where: { id: payment.id },
        data: { subdomainId: newSubdomain.id }
      });

      return { newSubdomain, userDatabase };
    });

    // 5. Jalankan provisioning di server cPanel (Subdomain, DB, User, Hak Akses, index.html)
    // Jika di Windows lokal, cpanelService otomatis menyimulasikan panggilan sukses ini
    await provisionSubdomain({
      subdomainName: name,
      docRoot,
      dbName,
      dbUser,
      dbPass: dbPassPlain
    });

    return res.status(201).json({
      success: true,
      message: 'Subdomain berhasil diklaim dan di-provision.',
      data: serializeBigInt({
        subdomain: result.newSubdomain,
        database: {
          id: result.userDatabase.id,
          dbName: result.userDatabase.dbName,
          dbUser: result.userDatabase.dbUser,
          dbPasswordPlain: dbPassPlain // Tampilkan password plain sekali saja saat berhasil klaim
        }
      })
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan server saat memproses klaim subdomain.',
      error: error.message
    });
  }
}

export async function getSubdomainDiskUsage(req: AuthenticatedRequest, res: Response) {
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
      },
      include: {
        databases: {
          where: { deletedAt: null }
        },
        payments: {
          where: { status: 'success' },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!subdomain) {
      return res.status(404).json({
        status: 'error',
        message: 'Subdomain tidak ditemukan atau bukan milik Anda.'
      });
    }

    // Ambil plan terasosiasi via pembayaran sukses terakhir, atau cari plan pertama sebagai fallback
    let plan: any = subdomain.payments[0]?.plan;
    if (!plan) {
      plan = await prisma.plan.findFirst({
        where: { isActive: true }
      });
    }

    if (!plan) {
      return res.status(500).json({
        status: 'error',
        message: 'Paket langganan (plan) tidak tersedia di sistem.'
      });
    }

    // A. Hitung Storage File Manager (Filesystem)
    const baseDir = getBaseDirectory(subdomain.docRoot);
    const filesUsedBytes = getDirectorySize(baseDir);
    const limitMb = subdomain.storageOverrideMb || plan.maxStorageMb;
    const limitBytes = limitMb * 1024 * 1024;
    const filesUsedMb = parseFloat((filesUsedBytes / 1024 / 1024).toFixed(2));
    const filesRemainingBytes = Math.max(0, limitBytes - filesUsedBytes);
    const filesRemainingMb = parseFloat((filesRemainingBytes / 1024 / 1024).toFixed(2));
    const filesPercentage = parseFloat(((filesUsedBytes / limitBytes) * 100).toFixed(2));

    // B. Hitung Ukuran Database MySQL
    let dbUsedBytes = 0;
    const databaseDetails = [];

    for (const db of subdomain.databases) {
      try {
        const queryRes = await prisma.$queryRawUnsafe<any[]>(
          `SELECT SUM(data_length + index_length) AS size_bytes 
           FROM information_schema.TABLES 
           WHERE table_schema = ?`,
          db.dbName
        );
        const bytes = queryRes[0]?.size_bytes ? Number(queryRes[0].size_bytes) : 0;
        dbUsedBytes += bytes;
        databaseDetails.push({
          dbName: db.dbName,
          usedBytes: bytes,
          usedMb: parseFloat((bytes / 1024 / 1024).toFixed(2))
        });
      } catch (err: any) {
        databaseDetails.push({
          dbName: db.dbName,
          usedBytes: 0,
          usedMb: 0,
          error: `Gagal membaca ukuran database: ${err.message}`
        });
      }
    }

    const dbUsedMb = parseFloat((dbUsedBytes / 1024 / 1024).toFixed(2));

    // C. Hitung Total Gabungan
    const totalUsedBytes = filesUsedBytes + dbUsedBytes;
    const totalUsedMb = parseFloat((totalUsedBytes / 1024 / 1024).toFixed(2));

    return res.status(200).json({
      success: true,
      data: {
        subdomainId: subdomain.id.toString(),
        subdomainName: subdomain.name,
        storage: {
          usedBytes: filesUsedBytes,
          usedMb: filesUsedMb,
          limitMb,
          limitBytes,
          remainingBytes: filesRemainingBytes,
          remainingMb: filesRemainingMb,
          percentage: filesPercentage
        },
        database: {
          usedBytes: dbUsedBytes,
          usedMb: dbUsedMb,
          databases: databaseDetails
        },
        totalUsedBytes,
        totalUsedMb
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat menghitung penggunaan penyimpanan.',
      error: error.message
    });
  }
}

export async function getUserSubdomains(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    const subdomains = await prisma.subdomain.findMany({
      where: {
        userId: BigInt(userId),
        deletedAt: null
      },
      include: {
        databases: {
          where: { deletedAt: null }
        },
        envs: true,
        deployments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const decryptedSubdomains = subdomains.map((sub) => {
      const decryptedDatabases = sub.databases.map((db) => {
        let plainPassword = db.dbPassword;
        if (db.dbPassword) {
          try {
            plainPassword = decryptString(db.dbPassword);
          } catch (err) {
            console.error(`Failed to decrypt password for database ${db.dbName}:`, err);
          }
        }
        return {
          ...db,
          dbPassword: plainPassword
        };
      });

      return {
        ...sub,
        databases: decryptedDatabases
      };
    });

    return res.status(200).json({
      success: true,
      data: serializeBigInt(decryptedSubdomains)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil daftar subdomain.',
      error: error.message
    });
  }
}

export async function deleteSubdomain(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    const subdomain = await prisma.subdomain.findFirst({
      where: {
        id: BigInt(subdomainId),
        userId: BigInt(userId),
        deletedAt: null
      }
    });

    if (!subdomain) {
      return res.status(404).json({
        status: 'error',
        message: 'Subdomain tidak ditemukan atau bukan milik Anda.'
      });
    }

    // Soft-delete subdomain
    await prisma.subdomain.update({
      where: { id: subdomain.id },
      data: {
        deletedAt: new Date(),
        status: 'inactive'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Subdomain berhasil dihapus.'
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat menghapus subdomain.',
      error: error.message
    });
  }
}

export async function getAdminStats(req: AuthenticatedRequest, res: Response) {
  try {
    const totalUsers = await prisma.user.count({ where: { deletedAt: null } });
    const totalSubdomains = await prisma.subdomain.count({ where: { deletedAt: null } });
    const totalDatabases = await prisma.userDatabase.count({ where: { deletedAt: null } });
    const activeQueueJobs = await prisma.deployment.count({ where: { status: 'queued', deletedAt: null } });

    const subdomainsList = await prisma.subdomain.findMany({
      where: { deletedAt: null }
    });

    let overallUsedBytes = 0;
    const consumers = [];

    for (const sub of subdomainsList) {
      try {
        const baseDir = getBaseDirectory(sub.docRoot);
        const sizeBytes = getDirectorySize(baseDir);
        overallUsedBytes += sizeBytes;
        consumers.push({
          name: `${sub.name}.subly.host`,
          usedBytes: sizeBytes,
          usedMb: parseFloat((sizeBytes / 1024 / 1024).toFixed(2))
        });
      } catch (err) {
        consumers.push({
          name: `${sub.name}.subly.host`,
          usedBytes: 0,
          usedMb: 0
        });
      }
    }

    consumers.sort((a, b) => b.usedBytes - a.usedBytes);
    const topConsumers = consumers.slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalSubdomains,
        totalDatabases,
        activeQueueJobs,
        storage: {
          usedBytes: overallUsedBytes,
          usedMb: parseFloat((overallUsedBytes / 1024 / 1024).toFixed(2)),
          limitGb: 256
        },
        topConsumers
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil stats admin.',
      error: error.message
    });
  }
}

export async function updateStorageOverride(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { storageOverrideMb } = req.body;


  try {
    const subdomain = await prisma.subdomain.findFirst({
      where: { id: BigInt(id), deletedAt: null }
    });

    if (!subdomain) {
      return res.status(404).json({
        status: 'error',
        message: 'Subdomain tidak ditemukan.'
      });
    }

    const updatedSubdomain = await prisma.subdomain.update({
      where: { id: subdomain.id },
      data: {
        storageOverrideMb: storageOverrideMb ? parseInt(storageOverrideMb.toString(), 10) : null
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Batas storage berhasil diperbarui.',
      data: serializeBigInt(updatedSubdomain)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memperbarui storage limit.',
      error: error.message
    });
  }
}


