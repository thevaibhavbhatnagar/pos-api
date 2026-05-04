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

const CRUD = ['view', 'create', 'update', 'delete'] as const;

type ModuleTree = {
  key: string;
  icon?: string;
  url?: string;
  children?: ModuleTree[];
};

const modules: ModuleTree[] = [
  {
    key: 'dashboard',
    icon: 'LayoutDashboard',
    url: '/dashboard',
  },
  {
    key: 'pos',
    icon: 'ShoppingCart',
    url: '/pos',
  },
  {
    key: 'kot',
    icon: 'Utensils',
    url: '/kot',
  },
  {
    key: 'orders',
    icon: 'ClipboardList',
    url: '/orders',
  },
  {
    key: 'reports',
    icon: 'BarChart3',
    children: [
      { key: 'day_report', url: '/reports/day' },
      { key: 'week_report', url: '/reports/week' },
      { key: 'month_report', url: '/reports/month' },
      { key: 'item_report', url: '/reports/item' },
    ],
  },
  {
    key: 'management',
    icon: 'Settings',
    children: [
      { key: 'categories', url: '/categories' },
      { key: 'products', url: '/products' },
      { key: 'users', url: '/users' },
      { key: 'branches', url: '/branches' },
      { key: 'roles', url: '/roles' },
    ],
  },
];

const title = (s: string) =>
  s
    .replaceAll('_', ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

async function createModuleTree(nodes: ModuleTree[], parentId?: string) {
  let order = 1;

  for (const node of nodes) {
    const module = await prisma.module.create({
      data: {
        key: node.key,
        name: title(node.key),
        parentId,
        order: order++,
        icon: node.icon,
        url: node.url,
      },
    });

    // Leaf node = permissions
    if (!node.children?.length) {
      const permissions = CRUD.map((action) => ({
        key: `${node.key}_${action}`,
        description: `${title(action)} ${title(node.key)}`,
        moduleId: module.id,
      }));

      await prisma.permission.createMany({
        data: permissions,
      });
    }

    if (node.children) {
      await createModuleTree(node.children, module.id);
    }
  }
}

async function main() {
  console.log('🌱 Seeding database...');

  // 🔥 CLEAN OLD DATA
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.module.deleteMany();

  // 🔥 CREATE MODULES
  await createModuleTree(modules);

  // 🔥 CREATE ROLES
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  // 🔥 CREATE ADMIN USER
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@gmail.com' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('12345678', 10);

    await prisma.user.create({
      data: {
        email: 'admin@gmail.com',
        name: 'Admin',
        password: hashedPassword,
        roleId: adminRole.id,
        branchId: null, // admin = no branch
      },
    });

    console.log('🔥 Admin created');
  }

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