import prisma from '../config/db.js';
import { callCpanelApi } from './cpanelService.js';
import { writeEnvFiles } from './envService.js';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import axios from 'axios';

// Helper: Salin file/folder secara rekursif
function copyFolderSync(from: string, to: string) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach((element) => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

// Helper: Menghitung total ukuran direktori secara rekursif
function getDirectorySize(dirPath: string): number {
  let totalSize = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      totalSize += getDirectorySize(filePath);
    } else {
      totalSize += stat.size;
    }
  }
  return totalSize;
}

// Helper: Translate path dari cPanel ke path mock lokal Windows jika diperlukan
function getLocalMockPath(dir: string): string {
  if (process.platform !== 'win32') return dir;
  const match = dir.match(/\/home\/[^/]+\/client\/([^/]+)(.*)/);
  if (match) {
    const subdomain = match[1];
    const subPath = match[2];
    return path.join(process.cwd(), 'uploads/client', subdomain, subPath);
  }
  return path.join(process.cwd(), 'uploads/client', path.basename(dir));
}

export async function validateAndDeployZip(params: {
  subdomainId: bigint;
  zipFilePath: string;
  notes?: string | null;
}): Promise<any> {
  const { subdomainId, zipFilePath, notes } = params;

  // 1. Cari subdomain & plan terkait
  const subdomain = await prisma.subdomain.findFirst({
    where: { id: subdomainId, deletedAt: null },
    include: { user: true }
  });

  if (!subdomain) {
    throw new Error('Subdomain tidak ditemukan atau telah dihapus.');
  }

  // Cari plan user via payment sukses terakhir
  const lastPayment = await prisma.payment.findFirst({
    where: { subdomainId: subdomain.id, status: 'success', deletedAt: null },
    include: { plan: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!lastPayment) {
    throw new Error('Informasi paket langganan (plan) tidak ditemukan untuk subdomain ini.');
  }

  const plan = lastPayment.plan;
  const tempDir = path.join(process.cwd(), 'uploads/temp', `${subdomain.name}-${Date.now()}`);

  try {
    // 2. Ekstrak file ZIP secara lokal ke folder temporary
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(tempDir, true);

    // 3. Iterasi file: Cek Blacklist & Hitung Ukuran
    let totalExtractedSize = 0;
    const blacklist = ['.exe', '.bat', '.sh', '.bin', '.msi', '.cgi'];
    
    const checkDirectory = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const relPath = path.relative(tempDir, filePath).replace(/\\/g, '/');

        // Lewati file library/vendor pihak ketiga dari pemindaian blacklist keamanan
        if (relPath.startsWith('node_modules/') || relPath.startsWith('vendor/')) {
          const stat = fs.statSync(filePath);
          if (!stat.isDirectory()) {
            totalExtractedSize += stat.size;
          }
          continue;
        }

        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          checkDirectory(filePath);
        } else {
          const ext = path.extname(file).toLowerCase();
          if (blacklist.includes(ext)) {
            throw new Error(`Security Violation: Ditemukan berkas berbahaya dilarang (${relPath})`);
          }
          totalExtractedSize += stat.size;
        }
      }
    };

    checkDirectory(tempDir);

    // 4. Validasi kuota penyimpanan (Storage Limit)
    const limitMb = subdomain.storageOverrideMb || plan.maxStorageMb;
    const limitBytes = limitMb * 1024 * 1024;
    
    if (totalExtractedSize > limitBytes) {
      throw new Error(`Storage Limit Exceeded: Ukuran project (${(totalExtractedSize / 1024 / 1024).toFixed(2)} MB) melebihi batas kuota Anda (${limitMb} MB).`);
    }

    // 5. Deploy ke cPanel / Mock
    const docRoot = subdomain.docRoot;
    const zipName = path.basename(zipFilePath);

    if (process.platform === 'win32') {
      // MODE MOCK WINDOWS: Tulis file langsung ke folder client mock lokal
      const mockDocRoot = getLocalMockPath(docRoot);
      if (!fs.existsSync(mockDocRoot)) {
        fs.mkdirSync(mockDocRoot, { recursive: true });
      }
      
      // Salin zip ke folder mock docRoot
      const mockZipDest = path.join(mockDocRoot, zipName);
      fs.copyFileSync(zipFilePath, mockZipDest);

      // Ekstrak via mock call
      await callCpanelApi('Fileman', 'extract', { dir: docRoot, file: zipName });

      // Hapus file zip
      await callCpanelApi('Fileman', 'delfile', { dir: docRoot, file: zipName });
    } else {
      // MODE REAL LINUX: Salin zip ke docRoot dan panggil API cPanel untuk mengekstrak
      if (!fs.existsSync(docRoot)) {
        fs.mkdirSync(docRoot, { recursive: true });
      }
      
      const realZipDest = path.join(docRoot, zipName);
      fs.copyFileSync(zipFilePath, realZipDest);

      // Panggil cPanel extract
      await callCpanelApi('Fileman', 'extract', { dir: docRoot, file: zipName });

      // Hapus file zip di server
      if (fs.existsSync(realZipDest)) {
        fs.unlinkSync(realZipDest);
      }
    }

    // 6. Sinkronisasi Environment Variables (.env) ke docRoot
    await writeEnvFiles(subdomain.id, docRoot);

    // 7. Simpan log/catatan deployment baru di DB
    const zipStat = fs.statSync(zipFilePath);
    
    // Cari versi terakhir
    const lastDeployment = await prisma.deployment.findFirst({
      where: { subdomainId: subdomain.id },
      orderBy: { version: 'desc' }
    });
    const nextVersion = lastDeployment ? lastDeployment.version + 1 : 1;

    const deployment = await prisma.deployment.create({
      data: {
        subdomainId: subdomain.id,
        zipPath: zipFilePath.replace(/\\/g, '/'),
        zipSize: BigInt(zipStat.size),
        extractedSize: BigInt(totalExtractedSize),
        version: nextVersion,
        status: 'success',
        notes: notes || `Deployment version ${nextVersion}`,
        deployedAt: new Date()
      }
    });

    // Perbarui status subdomain dan perpanjang expiredAt (auto-reactivate +30 hari untuk Free Tier)
    const now = new Date();
    const isFreePlan = plan.price === BigInt(0);
    const updateData: any = {};

    if (isFreePlan) {
      updateData.expiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 Hari
      updateData.status = 'active';
    } else if (subdomain.expiredAt && new Date(subdomain.expiredAt) > now) {
      updateData.status = 'active';
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.subdomain.update({
        where: { id: subdomain.id },
        data: updateData
      });
    }

    return deployment;

  } finally {
    // Bersihkan folder temp lokal
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

export async function parseGithubUrl(gitUrl: string): Promise<{ owner: string; repo: string }> {
  // Regex untuk menangkap owner dan repo dari https://github.com/owner/repo atau owner/repo
  const cleanUrl = gitUrl.replace(/\.git$/, '');
  const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/) || cleanUrl.match(/^([^/]+)\/([^/]+)$/);
  if (!match) {
    throw new Error('Format URL GitHub tidak valid. Contoh format: https://github.com/owner/repo');
  }
  return { owner: match[1], repo: match[2] };
}

export async function getGithubBranches(gitUrl: string, token?: string | null): Promise<string[]> {
  const { owner, repo } = await parseGithubUrl(gitUrl);
  const url = `https://api.github.com/repos/${owner}/${repo}/branches`;

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SublyJS-Backend'
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await axios.get(url, { headers, timeout: 8000 });
    return response.data.map((branch: any) => branch.name);
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      throw new Error('Repositori tidak ditemukan. Pastikan URL benar dan token akses memiliki izin untuk repositori ini.');
    }
    throw new Error(`Gagal menghubungi API GitHub: ${error.message}`);
  }
}

export async function deployFromGit(params: {
  subdomainId: bigint;
  gitUrl: string;
  branch: string;
  token?: string | null;
  notes?: string | null;
}): Promise<any> {
  const { subdomainId, gitUrl, branch, token, notes } = params;
  const { owner, repo } = await parseGithubUrl(gitUrl);

  const downloadUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`;
  const gitTempZipPath = path.join(process.cwd(), 'uploads/temp', `git-${subdomainId}-${Date.now()}.zip`);

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'SublyJS-Backend'
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    // 1. Download zipball repositori dari GitHub API
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      headers,
      timeout: 20000
    });

    // Pastikan folder temp exist
    const tempParentDir = path.dirname(gitTempZipPath);
    if (!fs.existsSync(tempParentDir)) {
      fs.mkdirSync(tempParentDir, { recursive: true });
    }

    // 2. Simpan file zipball
    fs.writeFileSync(gitTempZipPath, Buffer.from(response.data));

    // 3. Panggil fungsi verifikasi & deployment utama
    const deployment = await validateAndDeployZip({
      subdomainId,
      zipFilePath: gitTempZipPath,
      notes: notes || `GitHub Deploy - Branch: ${branch}`
    });

    return deployment;

  } catch (error: any) {
    throw new Error(`Git Deployment failed: ${error.message}`);
  } finally {
    // Hapus file zipball temporary
    if (fs.existsSync(gitTempZipPath)) {
      fs.unlinkSync(gitTempZipPath);
    }
  }
}
