import { JwtService } from '@nestjs/jwt';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaService } from 'src/prisma.service';

import { LoginDto } from './dto/login.dto';
import { GroupedModule } from 'src/role/role.service';

// Make this service injectable so it can be used in controllers
@Injectable()
export class AuthService {
  // Inject PrismaService and JwtService into AuthService
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private filterModules(modules: GroupedModule[]): GroupedModule[] {
    return modules
      .map((mod) => ({
        ...mod,
        children: this.filterModules(mod.children),
      }))
      .filter((mod) => mod.permissions.length > 0 || mod.children.length > 0);
  }

  // Login function to authenticate an existing user
  async login(dto: LoginDto) {
    // Find user in the database by email
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
        role: { deletedAt: null },
        OR: [{ branchId: null }, { branch: { deletedAt: null } }],
      },
      include: { role: true, branch: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    // If password is invalid, throw unauthorized exception
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    // Generate JWT access token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role.name,
      branchId: user.branchId,
    });

    // Return success message and JWT access token
    return {
      message: 'Login Successful',
      accessToken: token,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        branchId: user.branchId,
        branchName: user.branch?.name || null,
      },
    };
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, role: { deletedAt: null } },
      include: {
        role: {
          include: {
            permissions: {
              where: { deletedAt: null },
              include: {
                permission: {
                  include: { module: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.role) throw new NotFoundException('Role not found');

    const groupedMap = new Map<string, GroupedModule>();

    const modules = await this.prisma.module.findMany({
      where: { deletedAt: null },
    });

    for (const mod of modules) {
      groupedMap.set(mod.id, {
        ...mod,
        icon: mod.icon ?? undefined,
        url: mod.url ?? undefined,
        permissions: [],
        children: [],
      });
    }

    for (const perm of user.role.permissions) {
      const mod = perm.permission.module;

      groupedMap.get(mod.id)?.permissions.push({
        id: perm.permission.id,
        key: perm.permission.key,
        description: perm.permission.description,
      });
    }

    const moduleHierarchy: GroupedModule[] = [];

    for (const mod of groupedMap.values()) {
      if (mod.parentId) {
        const parent = groupedMap.get(mod.parentId);

        if (parent) {
          parent.children.push(mod);
          continue;
        }
      }

      moduleHierarchy.push(mod);
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      modules: this.filterModules(moduleHierarchy),
    };
  }
}
