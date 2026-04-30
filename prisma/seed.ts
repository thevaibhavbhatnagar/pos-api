import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import { PrismaClient } from 'src/generated/prisma/client';
import 'dotenv/config';
import * as bcrypt from 'bcrypt';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Seeding database...');

  // ✅ 1. Create or get ADMIN role
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  // ✅ 2. Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@gmail.com' },
  });

  if (existingAdmin) {
    console.log('✅ Admin already exists');
    return;
  }

  // ✅ 3. Hash password
  const hashedPassword = await bcrypt.hash('12345678', 10);

  // ✅ 4. Create admin user
  await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      name: 'Admin',
      password: hashedPassword,
      roleId: adminRole.id, // 🔥 important
      branchId: null,       // 🔥 admin has no branch
    },
  });

  console.log('🔥 Admin created successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
