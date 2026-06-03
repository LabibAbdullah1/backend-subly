import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${payments.length} payments:`);
    for (const p of payments) {
      console.log(`- ID: ${p.id}, Transaction: ${p.transactionId}, Status: ${p.status}`);
      console.log(`  Created At: ${p.createdAt}`);
      console.log(`  Diff from now: ${Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 1000 / 60)} minutes`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
