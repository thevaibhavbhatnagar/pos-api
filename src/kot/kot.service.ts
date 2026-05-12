import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ensureExists } from '../common/prisma/ensure-exists';
import { OrderStatus, Prisma } from 'src/generated/prisma/client';
import { AddKotDto } from './dto/add-kot.dto';
import { UpdateKotDto } from './dto/update-kot.dto';

@Injectable()
export class KotService {
  constructor(private prisma: PrismaService) {}

  // Reusable select (same style as Company/Publisher)
  private kotSelect = {
    id: true,

    kotNo: true,

    status: true,

    orderId: true,

    order: {
      select: {
        id: true,
        billNo: true,
        totalAmount: true,
        status: true,

        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },

        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        // FULL ORDER ITEMS
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            total: true,

            productId: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },

        createdAt: true,
        updatedAt: true,
      },
    },

    // THIS KOT ITEMS ONLY
    items: {
      select: {
        id: true,
        quantity: true,
        note: true,

        productId: true,

        product: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    },

    createdAt: true,
  } as const;

  private ensureKotExists(tx: Prisma.TransactionClient, id: string) {
    return ensureExists(
      tx.kot.findFirst({
        where: { id },
        select: { id: true },
      }),
      'kot not found',
    );
  }

  private ensureOrderExists(tx: Prisma.TransactionClient, id: string) {
    return ensureExists(
      tx.orders.findFirst({
        where: { id },
        select: { id: true },
      }),
      'order not found',
    );
  }

  async getKotLookup() {
    const kots = await this.prisma.kot.findMany({
      select: this.kotSelect,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Public KOTs fetched successfully',
      data: kots,
    };
  }

  async findAll(user: any, page: number = 1, limit: number = 10) {
    // safety
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 10)); // max 100

    const skip = (page - 1) * limit;

    const [kots, total] = await this.prisma.$transaction([
      this.prisma.kot.findMany({
        select: this.kotSelect,
        where: { branchId: user.branchId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.kot.count({ where: { branchId: user.branchId } }),
    ]);

    return {
      message: 'kots fetched successfully',
      data: kots,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: any) {
    const kot = await this.prisma.kot.findFirst({
      where: { id, branchId: user.branchId },
      select: this.kotSelect,
    });

    if (!kot) {
      throw new NotFoundException('kot not found');
    }

    return {
      message: 'kot fetched successfully',
      data: kot,
    };
  }

  async create(dto: AddKotDto, user: any) {
    return this.prisma.$transaction(async (tx) => {
      await this.ensureOrderExists(tx, dto.orderId);

      const kot = await tx.kot.create({
        data: {
          kotNo: `KOT-${Date.now()}`,
          orderId: dto.orderId,
          status: 'PENDING',
          branchId: user.branchId,

          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },

        select: this.kotSelect,
      });

      return {
        message: 'kot created successfully',
        data: kot,
      };
    });
  }

  async update(id: string, dto: UpdateKotDto, user: any) {
    return this.prisma.$transaction(async (tx) => {
      const existingKot = await tx.kot.findFirst({
        where: {
          id,
          branchId: user.branchId,
        },
      });

      if (!existingKot) {
        throw new NotFoundException('kot not found');
      }

      const kot = await tx.kot.update({
        where: { id: existingKot.id },

        data: {
          status: dto.status,
        },

        select: this.kotSelect,
      });

      // Get all KOTs of this order
      const allKots = await tx.kot.findMany({
        where: {
          orderId: kot.orderId,
          branchId: user.branchId,
        },

        select: {
          status: true,
        },
      });

      // Calculate overall order status
      let orderStatus: OrderStatus = 'PENDING';

      if (allKots.some((k) => k.status === 'PENDING')) {
        orderStatus = 'PENDING';
      } else if (allKots.some((k) => k.status === 'PREPARING')) {
        orderStatus = 'PREPARING';
      } else if (allKots.some((k) => k.status === 'READY')) {
        orderStatus = 'READY';
      } else if (allKots.every((k) => k.status === 'SERVED')) {
        orderStatus = 'COMPLETED';
      }

      // Update Order Status
      await tx.orders.update({
        where: {
          id: kot.orderId,
        },

        data: {
          status: orderStatus,
        },
      });

      return {
        message: 'KOT updated successfully',
        data: kot,
      };
    });
  }
  async delete(id: string, user: any) {
    const existingKot = await this.prisma.kot.findFirst({
      where: {
        id,
        branchId: user.branchId,
      },
    });

    if (!existingKot) {
      throw new NotFoundException('kot not found');
    }

    const kot = await this.prisma.kot.delete({
      where: { id: existingKot.id },
      select: this.kotSelect,
    });

    return {
      message: 'kot deleted successfully',
      data: kot,
    };
  }
}
