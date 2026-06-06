import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ensureExists } from '../common/prisma/ensure-exists';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class UserService {
  // Inject PrismaService into UserService
  constructor(private prisma: PrismaService) {}

  private ensureRoleExists(tx: Prisma.TransactionClient, id: string) {
    return ensureExists(
      tx.role.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      }),
      'role not found',
    );
  }

  async findAll(page: number = 1, limit: number = 10) {
    // safety
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 10)); // max 100

    const skip = (page - 1) * limit;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: {
          role: {
            name: {
              not: 'SUPER_ADMIN',
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          role: {
            select: {
              name: true,
              id: true,
            },
          },
          branchId: true,
          branch: {
            select: {
              name: true,
              id: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.user.count({
        where: {
          role: {
            name: {
              not: 'SUPER_ADMIN',
            },
          },
        },
      }),
    ]);

    return {
      message: 'Users fetched successfully',
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        branchId: true,
        branch: true,
        roleId: true,
        role: {
          select: {
            name: true,
            id: true,
            permissions: {
              select: {
                permissionId: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role.name === 'SUPER_ADMIN') {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User fetched successfully',
      data: user,
    };
  }

  async create(dto: CreateUserDto) {
    const role = await this.prisma.role.findUnique({
      where: {
        id: dto.roleId,
      },
    });

    if (role?.name === 'SUPER_ADMIN') {
      throw new ConflictException('SUPER_ADMIN user cannot be created');
    }

    // Check if a user with the given email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // If user exists, throw a conflict exception
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    await this.ensureRoleExists(this.prisma, dto.roleId);

    // Hash the user's password before saving it to the database
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        roleId: dto.roleId,
        branchId: dto.branchId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
      },
    });
    return {
      message: 'user created successfully',
      data: user,
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // SUPER_ADMIN user cannot be modified
    if (existingUser.role?.name === 'SUPER_ADMIN') {
      throw new ConflictException('SUPER_ADMIN user cannot be modified');
    }

    // Prevent assigning SUPER_ADMIN role
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: {
          id: dto.roleId,
        },
      });

      if (!role || role.deletedAt) {
        throw new NotFoundException('Role not found');
      }

      if (role.name === 'SUPER_ADMIN') {
        throw new ConflictException('SUPER_ADMIN role cannot be assigned');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        branchId: true,
      },
    });

    return {
      message: 'User updated successfully',
      data: user,
    };
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (user?.role?.name === 'SUPER_ADMIN') {
      throw new ConflictException('SUPER_ADMIN user cannot be deleted');
    }

    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }
}
