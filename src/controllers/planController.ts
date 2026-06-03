import { Request, Response } from 'express';
import prisma from '../config/db.js';
import { serializeBigInt } from '../utils/serialize.js';
import { CreatePlanSchema } from '../validator/billing.js';

// Get active plans (Public/Client)
export async function getActivePlans(req: Request, res: Response) {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
        deletedAt: null
      }
    });
    return res.status(200).json(serializeBigInt(plans));
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil paket hosting',
      error: error.message
    });
  }
}

// Get all plans including inactive (Admin only)
export async function getAllPlans(req: Request, res: Response) {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        deletedAt: null
      }
    });
    return res.status(200).json(serializeBigInt(plans));
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil seluruh paket hosting',
      error: error.message
    });
  }
}

// Create Plan (Admin only)
export async function createPlan(req: Request, res: Response) {
  const validation = CreatePlanSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { name, type, isActive, price, durationMonths, maxStorageMb, maxDatabases, description } = validation.data;

  try {
    const plan = await prisma.plan.create({
      data: {
        name,
        type,
        isActive,
        price: BigInt(price),
        durationMonths,
        maxStorageMb,
        maxDatabases,
        description
      }
    });
    return res.status(201).json({
      success: true,
      message: 'Paket hosting berhasil dibuat',
      data: serializeBigInt(plan)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal membuat paket hosting',
      error: error.message
    });
  }
}

// Update Plan (Admin only)
export async function updatePlan(req: Request, res: Response) {
  const { id } = req.params;
  const validation = CreatePlanSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(422).json({ errors: validation.error.format() });
  }

  const { name, type, isActive, price, durationMonths, maxStorageMb, maxDatabases, description } = validation.data;

  try {
    const existingPlan = await prisma.plan.findFirst({
      where: { id: BigInt(id), deletedAt: null }
    });

    if (!existingPlan) {
      return res.status(404).json({
        status: 'error',
        message: 'Paket hosting tidak ditemukan'
      });
    }

    const plan = await prisma.plan.update({
      where: { id: BigInt(id) },
      data: {
        name,
        type,
        isActive,
        price: BigInt(price),
        durationMonths,
        maxStorageMb,
        maxDatabases,
        description
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Paket hosting berhasil diperbarui',
      data: serializeBigInt(plan)
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memperbarui paket hosting',
      error: error.message
    });
  }
}

// Delete Plan / Soft Delete (Admin only)
export async function deletePlan(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const existingPlan = await prisma.plan.findFirst({
      where: { id: BigInt(id), deletedAt: null }
    });

    if (!existingPlan) {
      return res.status(404).json({
        status: 'error',
        message: 'Paket hosting tidak ditemukan'
      });
    }

    // Soft delete
    await prisma.plan.update({
      where: { id: BigInt(id) },
      data: { deletedAt: new Date() }
    });

    return res.status(200).json({
      success: true,
      message: 'Paket hosting berhasil dihapus'
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menghapus paket hosting',
      error: error.message
    });
  }
}
