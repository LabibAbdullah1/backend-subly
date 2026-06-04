import prisma from '../src/config/db.js';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerifiedAt: true,
    }
  });
  console.log('Registered Users:');
  console.log(users.map(u => ({ ...u, id: u.id.toString() })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
