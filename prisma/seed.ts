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
    url: '/kots',
  },
  {
    key: 'orders',
    icon: 'ClipboardList',
    url: '/orders',
  },
  {
    key: 'reports',
    icon: 'BarChart3',
    url: '/reports',
  },
  {
    key: 'management',
    icon: 'Settings',
    children: [
      { key: 'categories', url: '/categories' },
      { key: 'products', url: '/products' },
      { key: 'addons', url: '/addons' },
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
  console.log('🌱 Starting database seed...');

  // =====================================================
  // RESET RBAC CONFIGURATION
  // -----------------------------------------------------
  // Remove existing role-permission mappings, permissions,
  // and modules so the RBAC structure can be recreated
  // from the latest source of truth defined in this file.
  // =====================================================
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.module.deleteMany();

  console.log('🧹 RBAC configuration cleaned');

  // =====================================================
  // CREATE MODULES & PERMISSIONS
  // -----------------------------------------------------
  // Generates the module tree and CRUD permissions
  // defined in the `modules` configuration above.
  // =====================================================
  await createModuleTree(modules);

  console.log('📦 Modules and permissions created');

  // =====================================================
  // SUPER ADMIN ROLE
  // -----------------------------------------------------
  // SUPER_ADMIN is the system owner role.
  // This role always receives every permission available
  // in the application and bypasses normal RBAC checks.
  // =====================================================
  const superAdminRole = await prisma.role.upsert({
    where: {
      name: 'SUPER_ADMIN',
    },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
    },
  });

  console.log('👑 SUPER_ADMIN role ready');

  // Fetch all permissions available in the system
  const allPermissions = await prisma.permission.findMany({
    select: {
      id: true,
    },
  });

  // Refresh SUPER_ADMIN permissions
  await prisma.rolePermission.deleteMany({
    where: {
      roleId: superAdminRole.id,
    },
  });

  await prisma.rolePermission.createMany({
    data: allPermissions.map((permission) => ({
      roleId: superAdminRole.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  console.log('🔐 All permissions assigned to SUPER_ADMIN');

  // Create default SUPER_ADMIN account
  const existingSuperAdmin = await prisma.user.findUnique({
    where: {
      email: 'super.admin@gmail.com',
    },
  });

  if (!existingSuperAdmin) {
    const hashedPassword = await bcrypt.hash('12345678', 10);

    await prisma.user.create({
      data: {
        email: 'super.admin@gmail.com',
        name: 'Super Admin',
        password: hashedPassword,
        roleId: superAdminRole.id,
        branchId: null,
      },
    });

    console.log('🔥 SUPER_ADMIN user created');
  }

  // =====================================================
  // ADMIN ROLE
  // -----------------------------------------------------
  // ADMIN manages operational data but does not have
  // access to POS operations, KOT workflow, or Reports.
  // =====================================================
  const adminRole = await prisma.role.upsert({
    where: {
      name: 'ADMIN',
    },
    update: {},
    create: {
      name: 'ADMIN',
    },
  });

  console.log('👤 ADMIN role ready');

  // Fetch permissions excluding restricted modules
  const adminPermissions = await prisma.permission.findMany({
    where: {
      module: {
        key: {
          notIn: ['pos', 'kot', 'reports', 'orders'],
        },
      },
    },
    select: {
      id: true,
    },
  });

  // Refresh ADMIN permissions
  await prisma.rolePermission.deleteMany({
    where: {
      roleId: adminRole.id,
    },
  });

  await prisma.rolePermission.createMany({
    data: adminPermissions.map((permission) => ({
      roleId: adminRole.id,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });

  console.log('🔐 ADMIN permissions assigned');

  // Create default ADMIN account
  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: 'admin@gmail.com',
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('12345678', 10);

    await prisma.user.create({
      data: {
        email: 'admin@gmail.com',
        name: 'Admin',
        password: hashedPassword,
        roleId: adminRole.id,
        branchId: null,
      },
    });

    console.log('🔥 ADMIN user created');
  }

  console.log('✅ Database seeding completed successfully');
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
