import prisma from '../src/config/db.js';

async function listUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      role: true
    }
  });
  console.log(users.map(u => ({
    id: u.id.toString(),
    name: u.name,
    email: u.email,
    verified: !!u.emailVerifiedAt,
    role: u.role
  })));
}

listUsers().catch(console.error);
