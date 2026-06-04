// src/controllers/logController.ts
import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { decryptString } from '../utils/crypto.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const CPANEL_USER = process.env.CPANEL_USER || 'sublymyi';
const CPANEL_API_KEY = process.env.CPANEL_API_KEY;
const CPANEL_API_URL = process.env.CPANEL_API_URL;

// cPanel menyimpan log NodeJS di: ~/nodelogs/[domain].log
function getCpanelLogPath(fullDomain: string): string {
  return `/home/${CPANEL_USER}/nodelogs/${fullDomain}.log`;
}

// Path lokal mock untuk Windows development
function getMockLogPath(subdomainName: string): string {
  return path.join(process.cwd(), 'uploads/client', subdomainName, 'app.log');
}

// Baca baris terakhir dari sebuah file (tail -n lines)
function tailFile(filePath: string, lines: number): string[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const allLines = content.split('\n').filter(l => l.trim() !== '');
    return allLines.slice(-lines);
  } catch {
    return [];
  }
}

// Baca log cPanel via HTTP API (Fileman::get_file_content)
async function fetchCpanelLogContent(logPath: string): Promise<string | null> {
  if (!CPANEL_API_KEY || !CPANEL_API_URL) return null;

  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${CPANEL_API_URL}/execute/Fileman/get_file_content`, {
      params: {
        dir: path.dirname(logPath),
        file: path.basename(logPath),
      },
      headers: {
        Authorization: `cpanel ${CPANEL_USER}:${CPANEL_API_KEY}`
      },
      timeout: 8000
    });

    if (response.data?.data?.content) {
      return response.data.data.content;
    }
    return null;
  } catch (err: any) {
    console.error('[LogController] Failed to fetch cPanel log:', err.message);
    return null;
  }
}

// Mock log lines untuk development lokal (Windows)
function generateMockLogLines(fullDomain: string): string[] {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);
  const mockLines = [
    `[${fmt(new Date(now.getTime() - 120000))}] [INFO] Node.js app starting...`,
    `[${fmt(new Date(now.getTime() - 115000))}] [INFO] Server: ${fullDomain}`,
    `[${fmt(new Date(now.getTime() - 110000))}] [INFO] Environment: production`,
    `[${fmt(new Date(now.getTime() - 100000))}] [INFO] Listening on port 3000`,
    `[${fmt(new Date(now.getTime() - 90000))}]  [INFO] Database connected (MySQL)`,
    `[${fmt(new Date(now.getTime() - 80000))}]  [INFO] GET / 200 - 12ms`,
    `[${fmt(new Date(now.getTime() - 70000))}]  [INFO] GET /api/products 200 - 45ms`,
    `[${fmt(new Date(now.getTime() - 60000))}]  [WARN] Memory usage: 156MB / 512MB`,
    `[${fmt(new Date(now.getTime() - 45000))}]  [INFO] POST /api/orders 201 - 88ms`,
    `[${fmt(new Date(now.getTime() - 30000))}]  [INFO] GET /api/users 200 - 23ms`,
    `[${fmt(new Date(now.getTime() - 20000))}]  [INFO] GET /dashboard 200 - 7ms`,
    `[${fmt(new Date(now.getTime() - 10000))}]  [INFO] Process alive — uptime: ${Math.floor((now.getTime() - (now.getTime() - 120000)) / 1000)}s`,
    `[${fmt(now)}]                [MOCK] ⚠️  Mode development lokal — log ini adalah simulasi.`,
    `[${fmt(now)}]                [MOCK] Di cPanel production, ini menampilkan log Node.js asli.`,
  ];
  return mockLines;
}

/**
 * SSE endpoint: stream real-time Node.js logs dari cPanel
 * GET /subdomains/:id/logs/stream
 */
export async function streamNodejsLogs(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
    return;
  }

  try {
    // Verifikasi kepemilikan subdomain
    const subdomain = await prisma.subdomain.findFirst({
      where: {
        id: BigInt(subdomainId),
        userId: userId,
        deletedAt: null
      }
    });

    if (!subdomain) {
      res.status(404).json({ status: 'error', message: 'Subdomain tidak ditemukan.' });
      return;
    }

    const subdomainName = subdomain.name;

    // ─── Setup SSE ───
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    const sendEvent = (type: string, data: object) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Kirim event "connected"
    sendEvent('connected', {
      message: `Terhubung ke log stream: ${subdomain.fullDomain}`,
      timestamp: new Date().toISOString()
    });

    let lastLineCount = 0;
    let isFirstBatch = true;

    const poll = async () => {
      try {
        let lines: string[] = [];

        if (process.platform === 'win32') {
          // ─── MODE LOKAL (WINDOWS MOCK) ───
          const mockPath = getMockLogPath(subdomainName);
          if (fs.existsSync(mockPath)) {
            lines = tailFile(mockPath, 100);
          } else {
            // Generate mock logs yang realistis
            lines = generateMockLogLines(subdomain.fullDomain);
          }
        } else {
          // ─── MODE PRODUCTION (CPANEL LINUX) ───
          const logPath = getCpanelLogPath(subdomain.fullDomain);

          if (CPANEL_API_KEY && CPANEL_API_URL) {
            // Baca via HTTP cPanel API
            const content = await fetchCpanelLogContent(logPath);
            if (content) {
              lines = content.split('\n').filter(l => l.trim() !== '').slice(-200);
            }
          } else if (fs.existsSync(logPath)) {
            // Fallback: baca langsung (jika backend jalan di server cPanel)
            lines = tailFile(logPath, 200);
          }
        }

        if (isFirstBatch) {
          // Kirim semua baris existing saat pertama kali connect
          sendEvent('batch', {
            lines: lines.map((l, i) => ({ id: i, text: l, timestamp: new Date().toISOString() }))
          });
          lastLineCount = lines.length;
          isFirstBatch = false;
        } else {
          // Kirim hanya baris baru
          if (lines.length > lastLineCount) {
            const newLines = lines.slice(lastLineCount);
            newLines.forEach((line, i) => {
              sendEvent('line', {
                id: lastLineCount + i,
                text: line,
                timestamp: new Date().toISOString()
              });
            });
            lastLineCount = lines.length;
          }
        }

        // Kirim heartbeat agar koneksi tetap hidup
        res.write(': ping\n\n');

      } catch (pollErr: any) {
        sendEvent('error', { message: `Gagal membaca log: ${pollErr.message}` });
      }
    };

    // Poll setiap 3 detik
    await poll();
    const interval = setInterval(poll, 3000);

    // Cleanup saat client disconnect
    req.on('close', () => {
      clearInterval(interval);
      console.log(`[LogStream] Client disconnected from ${subdomainName} log stream`);
    });

  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'Gagal memulai log stream.',
        error: error.message
      });
    }
  }
}

/**
 * REST endpoint: ambil snapshot log terbaru (non-streaming)
 * GET /subdomains/:id/logs/recent
 */
export async function getRecentLogs(req: AuthenticatedRequest, res: Response) {
  const subdomainId = req.params.id;
  const userId = req.user?.id;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

  if (!userId) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    const subdomain = await prisma.subdomain.findFirst({
      where: { id: BigInt(subdomainId), userId, deletedAt: null }
    });

    if (!subdomain) {
      return res.status(404).json({ status: 'error', message: 'Subdomain tidak ditemukan.' });
    }

    let lines: string[] = [];

    if (process.platform === 'win32') {
      const mockPath = getMockLogPath(subdomain.name);
      lines = fs.existsSync(mockPath) ? tailFile(mockPath, limit) : generateMockLogLines(subdomain.fullDomain);
    } else {
      const logPath = getCpanelLogPath(subdomain.fullDomain);
      if (CPANEL_API_KEY && CPANEL_API_URL) {
        const content = await fetchCpanelLogContent(logPath);
        if (content) {
          lines = content.split('\n').filter(l => l.trim() !== '').slice(-limit);
        }
      } else if (fs.existsSync(logPath)) {
        lines = tailFile(logPath, limit);
      }
    }

    return res.status(200).json({
      success: true,
      data: { lines, count: lines.length, source: process.platform === 'win32' ? 'mock' : 'cpanel' }
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil log.',
      error: error.message
    });
  }
}
