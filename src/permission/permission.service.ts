import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

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
export class PermissionService {
  constructor(private prisma: PrismaService) {}

  private permissionSelect = {
    id: true,
    key: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    module: true,
  };

  async findAll() {
    const permissions = await this.prisma.permission.findMany({
      select: this.permissionSelect,
    });

    const modules = await this.prisma.module.findMany({
      select: {
        id: true,
        name: true,
        key: true,
        order: true,
        parentId: true,
        icon: true,
        url: true,
      },
    });

    const groupedMap = new Map<string, GroupedModule>();

    // Step 1: Add all modules to the map (even if they have no permissions)
    for (const mod of modules) {
      groupedMap.set(mod.id, {
        id: mod.id,
        name: mod.name,
        key: mod.key,
        order: mod.order,
        icon: mod.icon ?? undefined,
        url: mod.url ?? undefined,
        parentId: mod.parentId,
        permissions: [],
        children: [],
      });
    }

    // Step 2: Add permissions to the modules
    for (const perm of permissions) {
      const mod = groupedMap.get(perm.module.id)!;
      mod.permissions.push({
        id: perm.id,
        key: perm.key,
        description: perm.description ?? null,
      });
    }

    // Step 3: Build hierarchy
    const moduleHierarchy: GroupedModule[] = [];

    for (const mod of groupedMap.values()) {
      if (mod.parentId && groupedMap.has(mod.parentId)) {
        groupedMap.get(mod.parentId)!.children.push(mod);
      } else {
        moduleHierarchy.push(mod);
      }
    }

    // Optional: sort recursively
    function sortModules(modules: GroupedModule[]) {
      modules.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      modules.forEach((m) => sortModules(m.children));
    }

    sortModules(moduleHierarchy);

    return {
      message: 'permissions fetched successfully',
      data: moduleHierarchy,
    };
  }
}
