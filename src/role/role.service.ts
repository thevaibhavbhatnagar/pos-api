import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ensureExists } from '../common/prisma/ensure-exists';
import { Prisma } from 'src/generated/prisma/client';

// src/role/role.types.ts
export type PermissionItem = {
  id: string;
  key: string;
  description: string | null;
};

export type GroupedModule = {
  id: string;
  name: string;
  key: string;
  order: number;
  icon?: string;
  url?: string;
  parentId: string | null;
  permissions: PermissionItem[];
  children: GroupedModule[];
};

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  private roleSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  } as const;

  private ensureRoleExists(tx: Prisma.TransactionClient, id: string) {
    return ensureExists(
      tx.role.findFirst({
        where: { id, deletedAt: null },
        include: { permissions: { include: { permission: true } } },
      }),
      'role not found',
    );
  }

  async findAll(page: number = 1, limit: number = 10) {
    // safety
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 10)); // max 100

    const skip = (page - 1) * limit;

    const [roles, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        select: this.roleSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        where: {
          deletedAt: null,
          name: {
            not: 'SUPER_ADMIN',
          },
        },
      }),
      this.prisma.role.count({
        where: { deletedAt: null, name: { not: 'SUPER_ADMIN' } },
      }),
    ]);
    return {
      message: 'roles fetched successfully',
      data: roles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: string) {
    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });

    if (existingRole?.name === 'SUPER_ADMIN') {
      throw new ForbiddenException('SUPER_ADMIN role cannot be viewed');
    }

    const role = await this.prisma.role.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        ...this.roleSelect,

        permissions: {
          where: { deletedAt: null }, // ✅ ignore soft-deleted role_permissions
          select: {
            permissionId: true,
            permission: {
              select: {
                id: true,
                key: true,
                description: true,
                module: {
                  select: {
                    id: true,
                    name: true,
                    key: true,
                    order: true,
                    parentId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('role not found');
    }

    const groupedMap = new Map<string, GroupedModule>();

    for (const perm of role.permissions) {
      const mod = perm.permission.module;

      // Ensure module exists in map
      if (!groupedMap.has(mod.id)) {
        groupedMap.set(mod.id, {
          id: mod.id,
          name: mod.name,
          key: mod.key,
          order: mod.order,
          parentId: mod.parentId,
          permissions: [],
          children: [],
        });
      }

      // Add permission to module
      groupedMap.get(mod.id)!.permissions.push({
        id: perm.permission.id,
        key: perm.permission.key,
        description: perm.permission.description ?? null,
      });
    }

    // Now build parent-child hierarchy
    const moduleHierarchy: GroupedModule[] = [];

    for (const mod of groupedMap.values()) {
      if (mod.parentId && groupedMap.has(mod.parentId)) {
        // Attach to parent
        groupedMap.get(mod.parentId)!.children.push(mod);
      } else {
        // Top-level module
        moduleHierarchy.push(mod);
      }
    }

    // Optional: sort top-level modules
    moduleHierarchy.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return {
      message: 'role fetched successfully',
      data: {
        ...role,
        // optional: keep original flat role.permissions if you want
        permissionsByModule: moduleHierarchy, // ✅ best for UI
      },
    };
  }

  async createRole(dto: CreateRoleDto) {
    if (dto.name === 'SUPER_ADMIN') {
      throw new ForbiddenException('SUPER_ADMIN role cannot be created');
    }

    // 1) ensure permissions exist
    const perms = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds }, module: { deletedAt: null } },
      select: { id: true, key: true },
    });

    const foundIds = new Set(perms.map((p) => p.id));

    const missingIds = dto.permissionIds.filter((k) => !foundIds.has(k));

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Permission not found: ${missingIds.join(', ')}`,
      );
    }

    // 2) create role + mappings in one transaction
    const role = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: dto.name,
        },
      });

      // create role_permissions mapping
      await tx.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });

      // return the created role with permissions
      return tx.role.findUnique({
        where: { id: role.id },
        include: {
          permissions: {
            where: { deletedAt: null },
            include: {
              permission: {
                include: { module: true }, // ✅
              },
            },
          },
        },
      });
    });

    return {
      message: 'role created successfully',
      data: role,
    };
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (role?.name === 'SUPER_ADMIN') {
      throw new ForbiddenException('SUPER_ADMIN role cannot be modified');
    }

    // 1) ensure role exists + not deleted
    await this.ensureRoleExists(this.prisma, id);

    // 2) validate permission keys (only if provided)
    let perms: { id: string; key: string }[] = [];

    if (dto.permissionIds && dto.permissionIds.length > 0) {
      perms = await this.prisma.permission.findMany({
        where: { id: { in: dto.permissionIds }, module: { deletedAt: null } },
        select: { id: true, key: true },
      });

      const foundIds = new Set(perms.map((p) => p.id));
      const missingIds = dto.permissionIds.filter((id) => !foundIds.has(id));

      if (missingIds.length > 0) {
        throw new NotFoundException(
          `Permission not found: ${missingIds.join(', ')}`,
        );
      }
    }

    // 3) transaction: update role + replace role_permissions if provided
    const updated = await this.prisma.$transaction(async (tx) => {
      // replace permission mapping if provided
      if (dto.permissionIds) {
        // clear old mappings
        await tx.rolePermission.deleteMany({ where: { roleId: id } });

        // if empty array => role will have 0 permissions
        if (dto.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: perms.map((p) => ({
              roleId: id,
              permissionId: p.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      // return updated role with permissions
      return tx.role.findFirst({
        where: { id, deletedAt: null },
        select: {
          ...this.roleSelect,
          permissions: {
            where: { deletedAt: null },
            include: {
              permission: {
                include: { module: true }, // ✅
              },
            },
          },
        },

        // If you want permissions in response too, use include instead of select:
        // include: { permissions: { include: { permission: true } } },
      });
    });

    if (!updated) throw new NotFoundException('role not found');

    return {
      message: 'role updated successfully',
      data: updated,
    };
  }

  async deleteRole(id: string) {
    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });

    if (existingRole?.name === 'SUPER_ADMIN') {
      throw new ForbiddenException('SUPER_ADMIN role cannot be deleted');
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: this.roleSelect,
    });

    return {
      message: 'Role deleted successfully',
      data: role,
    };
  }
}
