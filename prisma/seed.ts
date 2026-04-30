import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import { PrismaClient } from 'src/generated/prisma/client';
import 'dotenv/config';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      name: 'Admin',
      password: 'password',
    },
  });

  console.log('✅ Seeding completed');
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
