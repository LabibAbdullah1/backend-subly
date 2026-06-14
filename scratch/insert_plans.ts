import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plansToSeed = [
    {
      name: 'Free Tier',
      type: 'PHP',
      isActive: true,
      price: BigInt(0),
      durationMonths: 1,
      maxStorageMb: 100,
      maxDatabases: 1,
      description: 'Paket gratis selamanya untuk Native HTML & PHP dengan 1 Database MySQL.'
    },
    {
      name: 'PHP Starter',
      type: 'PHP',
      isActive: true,
      price: BigInt(15000),
      durationMonths: 1,
      maxStorageMb: 500,
      maxDatabases: 1,
      description: 'Pilihan hemat untuk portofolio dan proyek PHP dasar Anda.'
    },
    {
      name: 'PHP Developer',
      type: 'PHP',
      isActive: true,
      price: BigInt(29000),
      durationMonths: 1,
      maxStorageMb: 1500,
      maxDatabases: 1,
      description: 'Sempurna untuk pengembang dengan integrasi Git otomatis dan database tambahan.'
    },
    {
      name: 'PHP Enterprise',
      type: 'PHP',
      isActive: true,
      price: BigInt(59000),
      durationMonths: 1,
      maxStorageMb: 5000,
      maxDatabases: 1,
      description: 'Resource server besar untuk aplikasi bisnis, tim web, atau performa maksimal.'
    },
    {
      name: 'Node Lite',
      type: 'NodeJS',
      isActive: true,
      price: BigInt(25000),
      durationMonths: 1,
      maxStorageMb: 1000,
      maxDatabases: 1,
      description: 'Mulai mendeploy aplikasi Node.js, Express, atau React/Next.js sederhana Anda.'
    },
    {
      name: 'Node Pro',
      type: 'NodeJS',
      isActive: true,
      price: BigInt(49000),
      durationMonths: 1,
      maxStorageMb: 3000,
      maxDatabases: 1,
      description: 'Pilihan terpopuler dengan alokasi storage lega dan limit database lebih besar.'
    },
    {
      name: 'Node Elite',
      type: 'NodeJS',
      isActive: true,
      price: BigInt(99000),
      durationMonths: 1,
      maxStorageMb: 10000,
      maxDatabases: 1,
      description: 'Performa tingkat tinggi dengan dedicated resource allocation dan support prioritas.'
    }
  ];

  console.log('Enforcing database limit of exactly 1 database for all existing plans in DB...');
  const updateResult = await prisma.plan.updateMany({
    where: { 
      maxDatabases: { gt: 1 },
      deletedAt: null
    },
    data: { maxDatabases: 1 }
  });
  console.log(`Updated ${updateResult.count} older database plan records to maxDatabases = 1.`);

  console.log('Inserting/updating specific plans to database...');
  for (const plan of plansToSeed) {
    const existing = await prisma.plan.findFirst({
      where: { name: plan.name, type: plan.type, deletedAt: null }
    });
    if (existing) {
      console.log(`Plan "${plan.name}" (${plan.type}) exists. Updating details...`);
      await prisma.plan.update({
        where: { id: existing.id },
        data: {
          price: plan.price,
          maxStorageMb: plan.maxStorageMb,
          maxDatabases: plan.maxDatabases,
          description: plan.description,
          isActive: plan.isActive
        }
      });
    } else {
      console.log(`Plan "${plan.name}" (${plan.type}) does not exist. Creating...`);
      await prisma.plan.create({ data: plan });
    }
  }
  console.log('✔ All plans successfully inserted/synchronized in the database!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
