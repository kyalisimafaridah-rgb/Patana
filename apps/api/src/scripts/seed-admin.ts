/**
 * Seed the first admin account.
 * Run with: npx tsx src/scripts/seed-admin.ts
 * Requires DATABASE_URL in .env
 */
import 'dotenv/config';

import { PrismaClient } from '../generated/prisma/index.js';
import { hashPassword } from '../utils/password.js';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@patana.ug';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMeImmediately123!';
  const name = process.env.ADMIN_NAME || 'Patana Admin';

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin already exists:', email);
    return;
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.admin.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Admin created successfully');
  console.log('   Email:', admin.email);
  console.log('   Name:', admin.name);
  console.log('   Role:', admin.role);
  console.log('\n⚠️  Change the password immediately after first login.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
