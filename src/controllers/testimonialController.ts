// src/controllers/testimonialController.ts
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import prisma from '../config/db.js';

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v));
}

// ─── CLIENT: Submit testimonial (1 per subdomain) ───────────────────────────

export async function submitTestimonial(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { subdomainId, rating, title, content } = req.body;

  if (!userId) return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });
  if (!subdomainId || !title?.trim() || !content?.trim()) {
    return res.status(422).json({ status: 'error', message: 'Subdomain, judul, dan isi wajib diisi.' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(422).json({ status: 'error', message: 'Rating harus antara 1 dan 5.' });
  }

  try {
    // Verifikasi subdomain milik user
    const subdomain = await prisma.subdomain.findFirst({
      where: { id: BigInt(subdomainId), userId, deletedAt: null }
    });
    if (!subdomain) {
      return res.status(404).json({ status: 'error', message: 'Subdomain tidak ditemukan.' });
    }

    // Cek apakah sudah ada testimonial untuk subdomain ini
    const existing = await prisma.testimonial.findFirst({
      where: { subdomainId: BigInt(subdomainId), deletedAt: null }
    });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'Anda sudah pernah mengirim testimonial untuk subdomain ini. Hanya 1 testimonial per subdomain.'
      });
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        userId,
        subdomainId: BigInt(subdomainId),
        rating: Number(rating),
        title: title.trim(),
        content: content.trim(),
        status: 'pending'
      },
      include: { user: { select: { name: true } } }
    });

    return res.status(201).json({
      success: true,
      message: 'Testimonial berhasil dikirim dan sedang menunggu review admin.',
      data: serializeBigInt(testimonial)
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

// ─── CLIENT: Get my testimonials ─────────────────────────────────────────────

export async function getMyTestimonials(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ status: 'error', message: 'Akses ditolak.' });

  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { userId, deletedAt: null },
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Ambil info subdomain terpisah
    const subdomainIds = testimonials
      .map(t => t.subdomainId)
      .filter((id): id is bigint => id !== null);

    const subdomains = await prisma.subdomain.findMany({
      where: { id: { in: subdomainIds }, deletedAt: null },
      select: { id: true, name: true, fullDomain: true }
    });
    const subdomainMap = Object.fromEntries(subdomains.map(s => [s.id.toString(), s]));

    const enriched = testimonials.map(t => ({
      ...t,
      subdomain: t.subdomainId ? subdomainMap[t.subdomainId.toString()] : null
    }));

    return res.status(200).json({ success: true, data: serializeBigInt(enriched) });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

// ─── PUBLIC: Get published testimonials (no auth) ─────────────────────────

export async function getPublicTestimonials(req: AuthenticatedRequest, res: Response) {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: {
        status: { in: ['approved', 'featured'] },
        deletedAt: null
      },
      include: {
        user: { select: { name: true } }
      },
      orderBy: [
        { status: 'asc' }, // featured comes first alphabetically... use createdAt instead
        { createdAt: 'desc' }
      ],
      take: 20
    });

    // Sort: featured dulu, lalu approved
    const sorted = [...testimonials].sort((a, b) => {
      if (a.status === 'featured' && b.status !== 'featured') return -1;
      if (b.status === 'featured' && a.status !== 'featured') return 1;
      return 0;
    });

    // Ambil info subdomain
    const subdomainIds = sorted
      .map(t => t.subdomainId)
      .filter((id): id is bigint => id !== null);

    const subdomains = await prisma.subdomain.findMany({
      where: { id: { in: subdomainIds }, deletedAt: null },
      select: { id: true, name: true, fullDomain: true }
    });
    const subdomainMap = Object.fromEntries(subdomains.map(s => [s.id.toString(), s]));

    const enriched = sorted.map(t => ({
      id: t.id,
      rating: t.rating,
      title: t.title,
      content: t.content,
      status: t.status,
      createdAt: t.createdAt,
      user: { name: t.user.name },
      subdomain: t.subdomainId ? subdomainMap[t.subdomainId.toString()] : null
    }));

    return res.status(200).json({ success: true, data: serializeBigInt(enriched) });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

// ─── ADMIN: Get all testimonials ──────────────────────────────────────────

export async function getAllTestimonials(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
  }

  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const subdomainIds = testimonials
      .map(t => t.subdomainId)
      .filter((id): id is bigint => id !== null);

    const subdomains = await prisma.subdomain.findMany({
      where: { id: { in: subdomainIds } },
      select: { id: true, name: true, fullDomain: true }
    });
    const subdomainMap = Object.fromEntries(subdomains.map(s => [s.id.toString(), s]));

    const enriched = testimonials.map(t => ({
      ...t,
      subdomain: t.subdomainId ? subdomainMap[t.subdomainId.toString()] : null
    }));

    return res.status(200).json({ success: true, data: serializeBigInt(enriched) });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

// ─── ADMIN: Update status testimonial ────────────────────────────────────

export async function updateTestimonialStatus(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
  }

  const { id } = req.params;
  const { status, adminNote } = req.body;
  const validStatuses = ['pending', 'approved', 'featured', 'rejected'];

  if (!validStatuses.includes(status)) {
    return res.status(422).json({ status: 'error', message: 'Status tidak valid.' });
  }

  try {
    const testimonial = await prisma.testimonial.update({
      where: { id: BigInt(id) },
      data: {
        status,
        adminNote: adminNote?.trim() || null,
        updatedAt: new Date()
      }
    });
    return res.status(200).json({ success: true, data: serializeBigInt(testimonial) });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}

// ─── ADMIN: Delete testimonial (soft delete) ─────────────────────────────

export async function deleteTestimonial(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak.' });
  }

  const { id } = req.params;

  try {
    await prisma.testimonial.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() }
    });
    return res.status(200).json({ success: true, message: 'Testimonial dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
