import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const subdomains = await prisma.subdomain.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  });
  console.log("SUBDOMAINS IN DB:");
  console.log(JSON.stringify(subdomains, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  , 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
