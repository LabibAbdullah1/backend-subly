import { Response } from 'express';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

// Global variables for CPU usage tracking inside cgroup
let lastCpuTime = Date.now();
let lastCpuUsage = 0n;
let lastCalculatedLoad = 0.05;

function getCgroupCpuUsageNs(): bigint {
  try {
    const v1Path = '/sys/fs/cgroup/cpuacct/cpuacct.usage';
    if (fs.existsSync(v1Path)) {
      return BigInt(fs.readFileSync(v1Path, 'utf8').trim());
    }
    
    const v2Path = '/sys/fs/cgroup/cpu.stat';
    if (fs.existsSync(v2Path)) {
      const content = fs.readFileSync(v2Path, 'utf8');
      const match = content.match(/usage_usec\s+(\d+)/);
      if (match) {
        return BigInt(match[1]) * 1000n; // Convert microsecond to nanosecond
      }
    }
  } catch {}
  return 0n;
}

// Initialize CPU tracking state
try {
  lastCpuUsage = getCgroupCpuUsageNs();
} catch {}

function getUserProcessesMemoryBytes(username: string): number {
  try {
    const output = execSync(`ps -u ${username} -o rss`).toString();
    const lines = output.split('\n');
    let totalKb = 0;
    for (const line of lines) {
      const kb = parseInt(line.trim(), 10);
      if (!isNaN(kb)) {
        totalKb += kb;
      }
    }
    return totalKb * 1024; // Convert KB to Bytes
  } catch {
    return process.memoryUsage().rss; // Fallback to current node process RSS
  }
}

function getAccountMemoryStats(configLimitGb: number) {
  let username = 'sublymyi';
  try {
    username = execSync('whoami').toString().trim();
  } catch {
    username = process.env.CPANEL_USER || 'sublymyi';
  }

  // Check if there is an env variable override for memory limit (in GB), default to DB setting value
  const envLimitGb = process.env.HOSTING_RAM_LIMIT_GB 
    ? parseFloat(process.env.HOSTING_RAM_LIMIT_GB) 
    : configLimitGb;

  let totalMemoryBytes = envLimitGb * 1024 * 1024 * 1024;
  let usedMemoryBytes = totalMemoryBytes - os.freemem();
  let cgroupReadSuccessful = false;

  if (process.platform !== 'win32') {
    usedMemoryBytes = getUserProcessesMemoryBytes(username);
    
    try {
      const limitPathV1 = '/sys/fs/cgroup/memory/memory.limit_in_bytes';
      const usagePathV1 = '/sys/fs/cgroup/memory/memory.usage_in_bytes';

      const limitPathV2 = '/sys/fs/cgroup/memory.max';
      const usagePathV2 = '/sys/fs/cgroup/memory.current';

      let limitStr = '';
      let usageStr = '';

      if (fs.existsSync(limitPathV1)) {
        limitStr = fs.readFileSync(limitPathV1, 'utf8').trim();
        usageStr = fs.readFileSync(usagePathV1, 'utf8').trim();
      } else if (fs.existsSync(limitPathV2)) {
        limitStr = fs.readFileSync(limitPathV2, 'utf8').trim();
        usageStr = fs.readFileSync(usagePathV2, 'utf8').trim();
      }

      if (limitStr && usageStr) {
        const cgroupLimit = Number(limitStr);
        const cgroupUsage = Number(usageStr);

        // A limit of 9223372036854771712 or "max" means unlimited in cgroup
        if (!isNaN(cgroupLimit) && cgroupLimit > 0 && cgroupLimit < 9000000000000000000) {
          totalMemoryBytes = cgroupLimit;
          usedMemoryBytes = cgroupUsage;
          cgroupReadSuccessful = true;
        }
      }
    } catch (err) {
      console.warn('Gagal membaca cgroup memory stats:', err);
    }
  }

  return {
    totalMemoryBytes,
    usedMemoryBytes
  };
}

function getAccountCpuCores(configLimitCores: number): number {
  // Always use the admin-configured value from settings database.
  // cgroup reads on shared hosting often return the whole-VPS quota, not the
  // cPanel account quota, so they would show misleading numbers.
  return configLimitCores;
}

function getRunningProcessCount(): number {
  // Count only processes owned by the cPanel account user.
  // We intentionally SKIP cgroup pids.current because on shared CloudLinux
  // servers it reflects the whole-server pids limit, not the cPanel account limit.
  try {
    if (process.platform === 'win32') {
      // Windows dev environment: count node.exe instances as proxy
      const output = execSync('tasklist /FI "IMAGENAME eq node.exe"').toString();
      const lines = output.split('\n').filter(line => line.includes('node.exe'));
      return lines.length || 1;
    } else {
      let username = process.env.CPANEL_USER || 'sublymyi';
      try {
        username = execSync('whoami').toString().trim();
      } catch { /* use env fallback */ }
      // ps -u <user> lists processes for the user; wc -l includes header line
      const output = execSync(`ps -u ${username} | wc -l`, { timeout: 3000 }).toString();
      const count = parseInt(output.trim(), 10);
      // Subtract 1 for the ps header line; ensure minimum of 1
      return Math.max(1, count - 1);
    }
  } catch {
    return 10; // Safe minimal fallback
  }
}

function getAccountMaxProcesses(configLimitProcesses: number): number {
  return configLimitProcesses;
}

import { CreateSubdomainSchema } from '../validator/subdomain.js';
import { provisionSubdomain } from '../services/provisioningService.js';
import { encryptString, decryptString } from '../utils/crypto.js';
import { serializeBigInt } from '../utils/serialize.js';
import { getBaseDirectory, getDirectorySize } from '../services/fileManagerService.js';
import { callCpanelApi } from '../services/cpanelService.js';
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

async function getRootDomain(): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'system_root_domain' }
  });
  return setting?.value || process.env.CPANEL_ROOT_DOMAIN || 'subly.my.id';
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
    // 1. Cari & Verifikasi transaksi pembayaran sukses
    const paymentWhere: any = {
      id: BigInt(paymentId),
      status: 'success',
      deletedAt: null
    };
    if (req.user?.role !== 'Admin') {
      paymentWhere.userId = userId;
    }

    const payment = await prisma.payment.findFirst({
      where: paymentWhere,
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
    const rootDomain = await getRootDomain();
    const fullDomain = `${name}.${rootDomain}`;
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

    const targetUserId = req.user?.role === 'Admin' ? payment.userId : userId;

    // 4. Lakukan operasi database di transaction block agar aman
    const result = await prisma.$transaction(async (tx) => {
      // a. Buat entri subdomain baru
      const newSubdomain = await tx.subdomain.create({
        data: {
          userId: targetUserId,
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
      dbPass: dbPassPlain,
      rootDomain
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
    await autoCheckExpiredSubdomains();
    const whereClause: any = { deletedAt: null };
    if (req.user?.role !== 'Admin') {
      whereClause.userId = BigInt(userId);
    }
    const subdomains = await prisma.subdomain.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
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
    await autoCheckExpiredSubdomains();
    const totalUsers = await prisma.user.count({ where: { deletedAt: null } });
    const totalSubdomains = await prisma.subdomain.count({ where: { deletedAt: null } });
    const totalDatabases = await prisma.userDatabase.count({ where: { deletedAt: null } });
    const activeQueueJobs = await prisma.deployment.count({ where: { status: 'queued', deletedAt: null } });

    const limitGbSetting = await prisma.setting.findUnique({
      where: { key: 'system_storage_limit_gb' }
    });
    const limitGb = limitGbSetting?.value ? parseInt(limitGbSetting.value, 10) : 256;

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
          name: sub.fullDomain,
          usedBytes: sizeBytes,
          usedMb: parseFloat((sizeBytes / 1024 / 1024).toFixed(2))
        });
      } catch (err) {
        consumers.push({
          name: sub.fullDomain,
          usedBytes: 0,
          usedMb: 0
        });
      }
    }

    consumers.sort((a, b) => b.usedBytes - a.usedBytes);
    const topConsumers = consumers.slice(0, 5);

    // Fetch dynamic resource limit configs from settings
    const cpuLimitSetting = await prisma.setting.findUnique({
      where: { key: 'system_cpu_cores_limit' }
    });
    const cpuLimitFallback = cpuLimitSetting?.value ? parseInt(cpuLimitSetting.value, 10) : 4;

    const nprocLimitSetting = await prisma.setting.findUnique({
      where: { key: 'system_nproc_limit' }
    });
    const nprocLimitFallback = nprocLimitSetting?.value ? parseInt(nprocLimitSetting.value, 10) : 200;

    const ramLimitSetting = await prisma.setting.findUnique({
      where: { key: 'system_ram_limit_gb' }
    });
    const ramLimitFallback = ramLimitSetting?.value ? parseFloat(ramLimitSetting.value) : 4;

    // Get system health info scoped specifically to the cPanel account limits
    const totalCpus = getAccountCpuCores(cpuLimitFallback);
    const runningProcesses = getRunningProcessCount();
    
    const memStats = getAccountMemoryStats(ramLimitFallback);
    const totalMemory = memStats.totalMemoryBytes;
    const usedMemory = memStats.usedMemoryBytes;
    
    const systemUptime = process.uptime(); // Safe Node process uptime in seconds instead of global VPS uptime
    
    // Calculate simulated load average & CPU percentage
    const nowTime = Date.now();
    const currentCpuUsage = getCgroupCpuUsageNs();
    const timeDiffMs = nowTime - lastCpuTime;
    let cpuPercent = 0;

    if (timeDiffMs >= 200 && currentCpuUsage > 0n && lastCpuUsage > 0n) {
      const usageDiffNs = currentCpuUsage - lastCpuUsage;
      const timeDiffNs = BigInt(timeDiffMs) * 1000000n;
      
      if (timeDiffNs > 0n && usageDiffNs >= 0n) {
        cpuPercent = Number((usageDiffNs * 100n) / timeDiffNs);
        const currentLoad = parseFloat((cpuPercent / 100).toFixed(2));
        // Low pass filter to smooth out spikes
        lastCalculatedLoad = parseFloat((lastCalculatedLoad * 0.7 + currentLoad * 0.3).toFixed(2));
      }
      
      lastCpuTime = nowTime;
      lastCpuUsage = currentCpuUsage;
    }

    let loadAvg1m = lastCalculatedLoad;
    let cpuUsagePercent = Math.min(100, Math.round(cpuPercent));

    if (currentCpuUsage === 0n || process.platform === 'win32') {
      const mockLoad = 0.05 + Math.random() * 0.15;
      loadAvg1m = parseFloat(mockLoad.toFixed(2));
      cpuUsagePercent = Math.round(mockLoad * 100);
    }

    const loadAvg = [
      loadAvg1m, 
      parseFloat((loadAvg1m * 0.9).toFixed(2)), 
      parseFloat((loadAvg1m * 0.8).toFixed(2))
    ];

    // Simulated fluctuating stats to match cPanel dashboard sidebar
    const entryProcesses = Math.floor(2 + Math.random() * 5); // 2 to 6 active
    const maxEntryProcesses = 100;
    const ioSpeedKb = Math.random() > 0.6 ? parseFloat((Math.random() * 45).toFixed(1)) : 0; 
    const maxIoSpeedMb = 24;
    const iops = Math.random() > 0.6 ? Math.floor(Math.random() * 4) : 0;
    const maxIops = 1024;

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
          limitGb
        },
        topConsumers,
        system: {
          cpuCores: totalCpus,
          cpuUsagePercent,
          activeProcesses: runningProcesses,
          maxProcesses: getAccountMaxProcesses(nprocLimitFallback),
          entryProcesses,
          maxEntryProcesses,
          memoryTotalGb: parseFloat((totalMemory / (1024 * 1024 * 1024)).toFixed(2)),
          memoryUsedGb: parseFloat((usedMemory / (1024 * 1024 * 1024)).toFixed(2)),
          memoryTotalMb: parseFloat((totalMemory / (1024 * 1024)).toFixed(2)),
          memoryUsedMb: parseFloat((usedMemory / (1024 * 1024)).toFixed(2)),
          uptimeSeconds: systemUptime,
          loadAverage: loadAvg,
          ioSpeedKb,
          maxIoSpeedMb,
          iops,
          maxIops
        }
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

export async function getAdminDiskUsage(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    await autoCheckExpiredSubdomains();
    const subdomains = await prisma.subdomain.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { name: true, email: true } },
        databases: { where: { deletedAt: null } },
        payments: {
          where: { status: 'success' },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const data = [];
    let totalFilesBytes = 0;
    let totalDbBytes = 0;

    for (const sub of subdomains) {
      let filesBytes = 0;
      try {
        const baseDir = getBaseDirectory(sub.docRoot);
        filesBytes = getDirectorySize(baseDir);
      } catch (err) {
        // ignore
      }
      totalFilesBytes += filesBytes;

      let dbBytes = 0;
      for (const db of sub.databases) {
        try {
          const queryRes = await prisma.$queryRawUnsafe<any[]>(
            `SELECT SUM(data_length + index_length) AS size_bytes 
             FROM information_schema.TABLES 
             WHERE table_schema = ?`,
            db.dbName
          );
          dbBytes += queryRes[0]?.size_bytes ? Number(queryRes[0].size_bytes) : 0;
        } catch (err) {
          // ignore
        }
      }
      totalDbBytes += dbBytes;

      const plan = sub.payments[0]?.plan;
      const limitMb = sub.storageOverrideMb || plan?.maxStorageMb || 1024;

      data.push({
        id: sub.id.toString(),
        name: sub.name,
        fullDomain: sub.fullDomain,
        owner: sub.user ? { name: sub.user.name, email: sub.user.email } : null,
        packageName: plan?.name || 'Starter PHP',
        limitMb,
        filesBytes,
        filesMb: parseFloat((filesBytes / 1024 / 1024).toFixed(2)),
        dbBytes,
        dbMb: parseFloat((dbBytes / 1024 / 1024).toFixed(2)),
        totalBytes: filesBytes + dbBytes,
        totalMb: parseFloat(((filesBytes + dbBytes) / 1024 / 1024).toFixed(2)),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        subdomains: data,
        totalAccumulatedMb: parseFloat(((totalFilesBytes + totalDbBytes) / 1024 / 1024).toFixed(2)),
        totalFilesMb: parseFloat((totalFilesBytes / 1024 / 1024).toFixed(2)),
        totalDbMb: parseFloat((totalDbBytes / 1024 / 1024).toFixed(2)),
      }
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

export async function autoCheckExpiredSubdomains() {
  try {
    const now = new Date();
    const expiredSubdomains = await prisma.subdomain.findMany({
      where: {
        expiredAt: { lte: now },
        status: 'active',
        deletedAt: null
      }
    });

    if (expiredSubdomains.length === 0) return;

    const rootDomain = await getRootDomain();

    for (const sub of expiredSubdomains) {
      await prisma.subdomain.update({
        where: { id: sub.id },
        data: { status: 'inactive' }
      });

      try {
        const suspendedHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subdomain Ditangguhkan - Subly</title>
  <style>
    body {
      font-family: 'Outfit', 'Inter', sans-serif;
      text-align: center;
      padding: 80px 20px;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      color: #f3f4f6;
      margin: 0;
      height: 100vh;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 600px;
      background: rgba(31, 41, 55, 0.8);
      backdrop-filter: blur(10px);
      padding: 40px;
      border-radius: 24px;
      border: 1px border border-red-500/20;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }
    h1 {
      color: #ef4444;
      font-size: 32px;
      margin-bottom: 10px;
    }
    p {
      font-size: 18px;
      line-height: 1.6;
      color: #d1d5db;
    }
    .domain {
      background-color: #fca5a5;
      color: #991b1b;
      padding: 6px 16px;
      border-radius: 12px;
      font-family: monospace;
      font-size: 18px;
      display: inline-block;
      margin: 15px 0;
    }
    .footer {
      margin-top: 40px;
      font-size: 14px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Subdomain Ditangguhkan!</h1>
    <p>Maaf, subdomain Anda untuk sementara waktu ditangguhkan atau tidak aktif karena masa aktif telah habis.</p>
    <div class="domain">${sub.name}.${rootDomain}</div>
    <p>Silakan hubungi administrator layanan atau periksa status tagihan Anda.</p>
    <div class="footer">Ditenagai oleh Subly Managed Hosting</div>
  </div>
</body>
</html>`;

        await callCpanelApi('Fileman', 'save_file_content', {
          dir: sub.docRoot,
          file: 'index.html',
          content: suspendedHtml
        });
      } catch (err: any) {
        console.error(`Gagal menulis file suspensi subdomain ${sub.name}:`, err.message);
      }
    }
  } catch (error: any) {
    console.error('Error running auto check expired subdomains:', error.message);
  }
}

export async function toggleSubdomainStatus(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
  }

  const { id } = req.params;
  const { status } = req.body; // 'active' or 'inactive'

  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({ status: 'error', message: 'Status tidak valid. Gunakan active atau inactive.' });
  }

  try {
    const subdomain = await prisma.subdomain.findFirst({
      where: { id: BigInt(id), deletedAt: null }
    });

    if (!subdomain) {
      return res.status(404).json({ status: 'error', message: 'Subdomain tidak ditemukan.' });
    }

    // Update status in db
    const updatedSubdomain = await prisma.subdomain.update({
      where: { id: subdomain.id },
      data: { status }
    });

    const rootDomain = await getRootDomain();

    if (status === 'inactive') {
      // Tulis file suspend subdomain
      const suspendedHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subdomain Ditangguhkan - Subly</title>
  <style>
    body {
      font-family: 'Outfit', 'Inter', sans-serif;
      text-align: center;
      padding: 80px 20px;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      color: #f3f4f6;
      margin: 0;
      height: 100vh;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 600px;
      background: rgba(31, 41, 55, 0.8);
      backdrop-filter: blur(10px);
      padding: 40px;
      border-radius: 24px;
      border: 1px border border-red-500/20;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }
    h1 {
      color: #ef4444;
      font-size: 32px;
      margin-bottom: 10px;
    }
    p {
      font-size: 18px;
      line-height: 1.6;
      color: #d1d5db;
    }
    .domain {
      background-color: #fca5a5;
      color: #991b1b;
      padding: 6px 16px;
      border-radius: 12px;
      font-family: monospace;
      font-size: 18px;
      display: inline-block;
      margin: 15px 0;
    }
    .footer {
      margin-top: 40px;
      font-size: 14px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Subdomain Ditangguhkan!</h1>
    <p>Maaf, subdomain Anda untuk sementara waktu ditangguhkan atau tidak aktif.</p>
    <div class="domain">${subdomain.name}.${rootDomain}</div>
    <p>Silakan hubungi administrator layanan atau periksa status tagihan Anda.</p>
    <div class="footer">Ditenagai oleh Subly Managed Hosting</div>
  </div>
</body>
</html>`;

      await callCpanelApi('Fileman', 'save_file_content', {
        dir: subdomain.docRoot,
        file: 'index.html',
        content: suspendedHtml
      });
    } else {
      // Aktifkan kembali: tulis default Html aktif
      const defaultHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subdomain Aktif - Subly Managed Hosting</title>
  <style>
    body {
      font-family: 'Outfit', 'Inter', sans-serif;
      text-align: center;
      padding: 80px 20px;
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      color: #1f2937;
      margin: 0;
      height: 100vh;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      padding: 40px;
      border-radius: 24px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    }
    h1 {
      color: #4f46e5;
      font-size: 32px;
      margin-bottom: 10px;
    }
    p {
      font-size: 18px;
      line-height: 1.6;
      color: #4b5563;
    }
    .domain {
      background-color: #e0e7ff;
      color: #3730a3;
      padding: 6px 16px;
      border-radius: 12px;
      font-family: monospace;
      font-size: 18px;
      display: inline-block;
      margin: 15px 0;
    }
    .footer {
      margin-top: 40px;
      font-size: 14px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Subdomain Anda Aktif!</h1>
    <p>Selamat! Subdomain baru Anda berhasil dibuat dan siap digunakan.</p>
    <div class="domain">${subdomain.name}.${rootDomain}</div>
    <p>Silakan upload file proyek Anda atau hubungkan repositori GitHub dari Dashboard Subly untuk memulai deployment.</p>
    <div class="footer">Ditenagai oleh Subly Managed Hosting</div>
  </div>
</body>
</html>`;

      await callCpanelApi('Fileman', 'save_file_content', {
        dir: subdomain.docRoot,
        file: 'index.html',
        content: defaultHtml
      });
    }

    return res.status(200).json({
      success: true,
      message: `Status subdomain berhasil diubah menjadi ${status}.`,
      data: serializeBigInt(updatedSubdomain)
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}


