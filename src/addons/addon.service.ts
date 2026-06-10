import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AddAddonDto } from './dto/add-addon.dto';
import { UpdateAddonDto } from './dto/update-addon.dto';
import { ensureExists } from '../common/prisma/ensure-exists';

@Injectable()
export class AddonService {
  constructor(private prisma: PrismaService) {}

  private addonSelect = {
    id: true,
    name: true,
    price: true,
    isActive: true,
    createdAt: true,
    deletedAt: true,
  } as const;

  async getAddonLookup() {
    const addons = await this.prisma.addon.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: this.addonSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Public addons fetched successfully',
      data: addons,
    };
  }

  async findAll(page: number = 1, limit: number = 10) {
    // safety
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 10)); // max 100

    const skip = (page - 1) * limit;

    const [addons, total] = await this.prisma.$transaction([
      this.prisma.addon.findMany({
        where: { deletedAt: null },
        select: this.addonSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.addon.count({ where: { deletedAt: null } }),
    ]);

    return {
      message: 'Addons fetched successfully',
      data: addons,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const addon = await this.prisma.addon.findFirst({
      where: { id, deletedAt: null },
      select: this.addonSelect,
    });

    if (!addon) {
      throw new NotFoundException('Addon not found');
    }

    return {
      message: 'Addon fetched successfully',
      data: addon,
    };
  }

  async addAddon(dto: AddAddonDto) {
    const existingAddon = await this.prisma.addon.findFirst({
      where: {
        name: dto.name,
        deletedAt: null,
      },
    });

    if (existingAddon) {
      throw new BadRequestException('Addon already exists');
    }

    const addon = await this.prisma.addon.create({
      data: dto, // since dto keys match
      select: this.addonSelect,
    });

    return {
      message: 'Addon created successfully',
      data: addon,
    };
  }

  async updateAddon(id: string, dto: UpdateAddonDto) {
    await ensureExists(
      this.prisma.addon.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      }),
      'Addon not found',
    );

    if (dto.name) {
      const existingAddon = await this.prisma.addon.findFirst({
        where: {
          name: dto.name,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existingAddon) {
        throw new BadRequestException('Addon already exists');
      }
    }

    const addon = await this.prisma.addon.update({
      where: { id },
      data: dto,
      select: this.addonSelect,
    });

    return {
      message: 'Addon updated successfully',
      data: addon,
    };
  }

  async deleteAddon(id: string) {
    await ensureExists(
      this.prisma.addon.findFirst({
        where: { id, deletedAt: null },
        select: { id: true },
      }),
      'Addon not found',
    );

    const addon = await this.prisma.addon.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      select: this.addonSelect,
    });

    return {
      message: 'Addon deleted successfully',
      data: addon,
    };
  }
}
