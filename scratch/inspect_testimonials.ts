import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v));
}

async function main() {
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

  const finalResult = serializeBigInt(enriched);
  console.log("FINAL SERIALIZED DATA:");
  console.log(JSON.stringify(finalResult, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
