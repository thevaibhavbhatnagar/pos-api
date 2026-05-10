import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ensureExists } from '../common/prisma/ensure-exists';
import { Prisma } from 'src/generated/prisma/client';
import { AddOrderDto } from './dto/add-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  // Reusable select (same style as Company/Publisher)
  private orderSelect = {
    id: true,
    billNo: true,

    totalAmount: true,
    subTotal: true,
    discountAmount: true,
    taxAmount: true,

    paymentMethod: true,
    status: true,
    paymentStatus: true,

    notes: true,

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
  } as const;

  private kotSelectItem = {
    id: true,
    kotNo: true,
    status: true,

    items: {
      select: {
        id: true,
        quantity: true,

        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
  } as const;

  private ensureBranchExists(tx: Prisma.TransactionClient, id: string) {
    return ensureExists(
      tx.branch.findFirst({
        where: { id },
        select: { id: true },
      }),
      'branch not found',
    );
  }

  async getOrderLookup() {
    const products = await this.prisma.orders.findMany({
      select: this.orderSelect,
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Public Orders fetched successfully',
      data: products,
    };
  }

  async findAll(page: number = 1, limit: number = 10) {
    // safety
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 10)); // max 100

    const skip = (page - 1) * limit;

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.orders.findMany({
        select: this.orderSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.orders.count(),
    ]);

    return {
      message: 'Orders fetched successfully',
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id },
      select: {
        ...this.orderSelect,
        kots: {
          select: this.kotSelectItem,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Product not found');
    }

    return {
      message: 'Orders fetched successfully',
      data: order,
    };
  }

  async create(dto: AddOrderDto) {
    await this.ensureBranchExists(this.prisma, dto.branchId);

    return this.prisma.$transaction(async (tx) => {
      // Get last order for bill no
      const lastOrder = await tx.orders.findFirst({
        orderBy: {
          createdAt: 'desc',
        },
      });

      const nextBillNo = lastOrder
        ? `INV-${Number(lastOrder.billNo.split('-')[1]) + 1}`
        : 'INV-1001';

      let subTotal = 0;

      // prepare order items with total price
      const orderItems = await Promise.all(
        dto.items.map(async (item) => {
          const product = await tx.product.findUnique({
            where: {
              id: item.productId,
            },
          });
          if (!product) {
            throw new NotFoundException('Product not found');
          }

          const total = product.price * item.quantity;
          subTotal += total;

          return {
            productId: item.productId,
            quantity: item.quantity,
            price: product.price,
            total,
          };
        }),
      );

      const discountAmount = dto.discountAmount ?? 0;
      const taxAmount = dto.taxAmount ?? 0;
      const totalAmount = subTotal - discountAmount + taxAmount;

      //  Create order
      const order = await tx.orders.create({
        data: {
          billNo: nextBillNo,

          branchId: dto.branchId,
          userId: dto.userId,

          subTotal: subTotal,
          discountAmount: discountAmount,
          taxAmount: taxAmount,
          totalAmount: totalAmount,

          paymentStatus: 'PENDING',
          status: 'PENDING',

          notes: dto.notes,

          paymentMethod: dto.paymentMethod ?? null,

          items: {
            create: orderItems,
          },
        },
        select: this.orderSelect,
      });

      // Create KOT
      const kot = await tx.kot.create({
        data: {
          kotNo: `KOT-${Date.now()}`,
          orderId: order.id,
          status: 'PENDING',
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        select: this.kotSelectItem,
      });

      return {
        message: 'Order created successfully',
        data: {
          order,
          kot,
        },
      };
    });
  }

  /* Update Flow 
  
  1. Find existing order
2. Validate products
3. Recalculate totals
4. Replace order items
5. Update order
6. Detect newly added items
7. Create NEW KOT for new items only
  */
  async update(id: string, dto: UpdateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // Check order exists
      const existingOrder = await tx.orders.findUnique({
        where: { id },

        include: {
          items: true,
          kots: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!existingOrder) {
        throw new NotFoundException('Order not found');
      }

      let subTotal = 0;

      // Prepare updated order items
      const updatedItems = await Promise.all(
        dto.items.map(async (item) => {
          const product = await tx.product.findUnique({
            where: {
              id: item.productId,
            },
          });

          if (!product) {
            throw new NotFoundException('Product not found');
          }

          const total = product.price * item.quantity;

          subTotal += total;

          return {
            productId: item.productId,
            quantity: item.quantity,
            price: product.price,
            total,
          };
        }),
      );

      const discountAmount = dto.discountAmount ?? 0;
      const taxAmount = dto.taxAmount ?? 0;

      const totalAmount = subTotal - discountAmount + taxAmount;

      // Find newly added items
      const existingProductIds = new Set(
        existingOrder.items.map((item) => item.productId),
      );

      const newItems = updatedItems.filter(
        (item) => !existingProductIds.has(item.productId),
      );

      // Delete old order items
      await tx.orderItem.deleteMany({
        where: {
          orderId: id,
        },
      });

      // Recreate updated order items
      await tx.orderItem.createMany({
        data: updatedItems.map((item) => ({
          orderId: id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
      });

      // Update order
      const order = await tx.orders.update({
        where: { id },

        data: {
          branchId: dto.branchId,
          userId: dto.userId,

          subTotal,
          discountAmount,
          taxAmount,
          totalAmount,

          paymentMethod: dto.paymentMethod ?? null,
        },

        select: this.orderSelect,
      });

      // Create NEW KOT only for newly added items
      if (newItems.length > 0) {
        await tx.kot.create({
          data: {
            kotNo: `KOT-${Date.now()}`,
            orderId: id,
            status: 'PENDING',

            items: {
              create: newItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          },
        });
      }

      return {
        message: 'Order updated successfully',
        data: order,
      };
    });
  }
  async delete(id: string) {
    const product = await this.prisma.orders.delete({
      where: { id },
      select: this.orderSelect,
    });
    return {
      message: 'Order deleted successfully',
      data: product,
    };
  }
}
