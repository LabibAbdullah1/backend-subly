import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const t = await prisma.testimonial.findFirst({
    include: {
      user: { select: { name: true, email: true } }
    }
  });
  if (!t) {
    console.log("No testimonials found in database.");
    return;
  }
  
  console.log("=== t object destructured WITH user relation ===");
  const destructured = { ...t };
  console.log(destructured);
  console.log("user exists on destructured?", 'user' in destructured);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
