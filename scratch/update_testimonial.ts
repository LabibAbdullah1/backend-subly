import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.testimonial.update({
    where: { id: 1n },
    data: { subdomainId: 18n }
  });
  console.log("Updated testimonial:", JSON.stringify(updated, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  , 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
