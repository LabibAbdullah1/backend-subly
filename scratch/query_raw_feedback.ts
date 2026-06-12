import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("=== RAW SQL SELECT FROM feedback ===");
  try {
    const raw = await prisma.$queryRawUnsafe("SELECT * FROM feedback");
    console.log(JSON.stringify(raw, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    , 2));
  } catch (err: any) {
    console.error("Raw query failed:", err.message);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
