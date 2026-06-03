import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('=== MEMULAI SEEDING DATA TESTING ===\n');

  const salt = await bcryptjs.genSalt(12);
  const hashedPassword = await bcryptjs.hash('password123', salt);

  // 1. Seed / Upsert Admin User (Role: Admin)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@subly.net' },
    update: {
      password: hashedPassword,
      role: 'Admin',
      emailVerifiedAt: new Date(),
    },
    create: {
      name: 'Admin Subly',
      email: 'admin@subly.net',
      password: hashedPassword,
      role: 'Admin',
      emailVerifiedAt: new Date(),
    }
  });
  console.log('✔ Admin user seeded:', admin.email);

  // 2. Seed / Upsert Client User (Role: Client, Email Verified)
  const client = await prisma.user.upsert({
    where: { email: 'client@subly.net' },
    update: {
      password: hashedPassword,
      role: 'Client',
      emailVerifiedAt: new Date(),
    },
    create: {
      name: 'Labib Client',
      email: 'client@subly.net',
      password: hashedPassword,
      role: 'Client',
      emailVerifiedAt: new Date(),
    }
  });
  console.log('✔ Client user seeded:', client.email);

  // 3. Seed / Upsert Default Hosting Plans (PHP & Node.js)
  const plansData = [
    { id: 1n, name: 'Subly PHP Standard', price: 29000n, type: 'PHP', description: 'Perfect for small Laravel/PHP portfolio sites.', maxStorageMb: 1024, maxDatabases: 1, durationMonths: 1, isActive: true },
    { id: 2n, name: 'Subly PHP Developer', price: 59000n, type: 'PHP', description: 'Great for active web developer sites and APIs.', maxStorageMb: 5120, maxDatabases: 3, durationMonths: 1, isActive: true },
    { id: 3n, name: 'Subly Node.js Starter', price: 49000n, type: 'NodeJS', description: 'Lightweight Node/Express deployment environment.', maxStorageMb: 2048, maxDatabases: 2, durationMonths: 1, isActive: true },
    { id: 4n, name: 'Subly Node.js Pro', price: 99000n, type: 'NodeJS', description: 'High-performance Node server for production apps.', maxStorageMb: 10240, maxDatabases: 5, durationMonths: 1, isActive: true }
  ];

  for (const plan of plansData) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        price: plan.price,
        type: plan.type,
        description: plan.description,
        maxStorageMb: plan.maxStorageMb,
        maxDatabases: plan.maxDatabases,
        durationMonths: plan.durationMonths,
        isActive: plan.isActive,
      },
      create: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        type: plan.type,
        description: plan.description,
        maxStorageMb: plan.maxStorageMb,
        maxDatabases: plan.maxDatabases,
        durationMonths: plan.durationMonths,
        isActive: plan.isActive,
      }
    });
    console.log('✔ Hosting Plan seeded:', plan.name);
  }

  // 4. Seed / Upsert Discount Vouchers
  const vouchersData = [
    { code: 'SUBLYHEMAT', type: 'percent', rewardAmount: 20, usageLimit: 100, expiresAt: new Date('2028-12-31') },
    { code: 'WELCOME50', type: 'percent', rewardAmount: 50, usageLimit: 100, expiresAt: new Date('2028-12-31') },
    { code: 'PROMOBLUE', type: 'percent', rewardAmount: 15, usageLimit: 100, expiresAt: new Date('2028-12-31') }
  ];

  for (const vc of vouchersData) {
    await prisma.voucher.upsert({
      where: { code: vc.code },
      update: {
        type: vc.type,
        rewardAmount: vc.rewardAmount,
        usageLimit: vc.usageLimit,
        expiresAt: vc.expiresAt
      },
      create: {
        code: vc.code,
        type: vc.type,
        rewardAmount: vc.rewardAmount,
        usageLimit: vc.usageLimit,
        expiresAt: vc.expiresAt
      }
    });
    console.log('✔ Voucher seeded:', vc.code);
  }

  console.log('\n=== SEEDING SELESAI (SUKSES) ===');
}

main()
  .catch((err) => {
    console.error('✖ Terjadi kesalahan saat seeding:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
