import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const t = await prisma.testimonial.findFirst();
  if (!t) {
    console.log("No testimonials found in database.");
    return;
  }
  
  console.log("=== KEYS of original t ===");
  console.log(Object.keys(t));
  
  console.log("=== t object destructured {...t} ===");
  const destructured = { ...t };
  console.log(destructured);
  console.log("subdomainId exists on destructured?", 'subdomainId' in destructured);
  console.log("subdomain_id exists on destructured?", 'subdomain_id' in destructured);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
