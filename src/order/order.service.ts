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
        addons: {
          select: {
            id: true,
            addonId: true,
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

  async findAll(user: any, page: number = 1, limit: number = 10) {
    // safety
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 10)); // max 100

    const skip = (page - 1) * limit;

    console.log('user', user);

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.orders.findMany({
        select: this.orderSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        where: { branchId: user.branchId },
      }),
      this.prisma.orders.count({ where: { branchId: user.branchId } }),
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

  async findOne(id: string, user: any) {
    const order = await this.prisma.orders.findUnique({
      where: { id, branchId: user.branchId },
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
  async create(dto: AddOrderDto, user: any) {
    // Validate branch exists
    await this.ensureBranchExists(this.prisma, dto.branchId);

    // Order must contain at least one item
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      // =========================================
      // Generate Next Invoice Number
      // =========================================
      const lastOrder = await tx.orders.findFirst({
        orderBy: {
          createdAt: 'desc',
        },
      });

      const nextBillNo = lastOrder
        ? `INV-${Number(lastOrder.billNo.split('-')[1]) + 1}`
        : 'INV-1001';

      let subTotal = 0;

      // =========================================
      // Prepare Order Items
      // =========================================
      const orderItems = await Promise.all(
        dto.items.map(async (item) => {
          // Fetch product
          const product = await tx.product.findUnique({
            where: {
              id: item.productId,
            },
          });

          if (!product) {
            throw new NotFoundException(`Product not found: ${item.productId}`);
          }

          // =========================================
          // Fetch Selected Addons
          // =========================================
          const addons = item.addonIds?.length
            ? await tx.addon.findMany({
                where: {
                  id: {
                    in: item.addonIds,
                  },
                  isActive: true,
                },
              })
            : [];

          // Ensure all addon ids are valid
          if (item.addonIds?.length && addons.length !== item.addonIds.length) {
            throw new BadRequestException('One or more addons are invalid');
          }

          // =========================================
          // Calculate Item Price
          // =========================================

          // Sum of addon prices
          const addonTotal = addons.reduce(
            (sum, addon) => sum + addon.price,
            0,
          );

          // Product price + selected addons
          const itemPrice = product.price + addonTotal;

          // Final line total
          const total = itemPrice * item.quantity;

          // Add to order subtotal
          subTotal += total;

          // =========================================
          // Create OrderItem + OrderItemAddon
          // =========================================
          return {
            productId: item.productId,
            quantity: item.quantity,

            // Snapshot price at ordering time
            price: itemPrice,

            total,

            addons: {
              create: addons.map((addon) => ({
                // Reference to original addon
                addonId: addon.id,

                // Snapshot fields
                name: addon.name,
                price: addon.price,
              })),
            },
          };
        }),
      );

      // =========================================
      // Calculate Final Totals
      // =========================================
      const discountAmount = dto.discountAmount ?? 0;

      const taxAmount = dto.taxAmount ?? 0;

      const totalAmount = subTotal - discountAmount + taxAmount;

      // =========================================
      // Create Order
      // =========================================
      const order = await tx.orders.create({
        data: {
          billNo: nextBillNo,

          branchId: user.branchId,
          userId: dto.userId,

          subTotal,
          discountAmount,
          taxAmount,
          totalAmount,

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

      // =========================================
      // Create Kitchen Order Ticket (KOT)
      // =========================================
      const kot = await tx.kot.create({
        data: {
          kotNo: `KOT-${Date.now()}`,
          orderId: order.id,
          branchId: user.branchId,
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

      // =========================================
      // Return Response
      // =========================================
      return {
        message: 'Order created successfully',
        data: {
          order,
          kot,
        },
      };
    });
  }

  /*
|--------------------------------------------------------------------------
| Update Order Flow (Append-Only POS Architecture)
|--------------------------------------------------------------------------
|
| This flow is designed for restaurant POS systems where:
| - Existing KOTs should never be modified
| - Kitchen history must remain intact
| - New items generate new KOTs
| - Product prices are always fetched from DB
| - Selected addons are stored as snapshots
|
| Flow:
|
| 1. Find Existing Order
|    - Validate order exists
|    - Validate branch ownership
|
| 2. Validate Incoming Products
|    - Ensure all products exist
|    - Use DB price instead of frontend price
|
| 3. Validate Incoming Addons
|    - Ensure all addon IDs exist
|    - Ensure addons are active
|
| 4. Calculate Item Totals
|    - Product Price
|    - Addon Total
|    - Item Price = Product + Addons
|    - Line Total = Item Price × Quantity
|
| 5. Create Order Item Snapshots
|    - Store product price at order time
|    - Store addon name and price at order time
|    - Preserve historical accuracy
|
| 6. Append New Order Items
|    - Do NOT modify existing items
|    - Do NOT delete existing items
|    - Preserve order history
|
| 7. Recalculate Order Totals
|    - Existing Subtotal + New Subtotal
|    - Apply Discount
|    - Apply Tax
|
| 8. Update Order
|    - Update subtotal
|    - Update tax
|    - Update discount
|    - Update total amount
|    - Update payment method
|
| 9. Create New KOT
|    - Generate separate KOT
|    - Include newly added products
|    - Preserve previous KOT history
|
| Result:
|
| Order
|   ├── Existing Items
|   ├── Existing Addons
|   ├── Newly Added Items
|   └── Newly Added Addons
|
| KOT-001
|   ├── Existing Kitchen Items
|
| KOT-002
|   ├── Newly Added Kitchen Items
|
| OrderItem
|   ├── Product Snapshot
|   └── OrderItemAddon[]
|
| OrderItemAddon
|   ├── addonId
|   ├── name
|   └── price
|
|--------------------------------------------------------------------------
*/
  async update(id: string, dto: UpdateOrderDto, user: any) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      // =========================================
      // Check Order Exists
      // =========================================
      const existingOrder = await tx.orders.findFirst({
        where: {
          id,
          branchId: user.branchId,
        },

        select: {
          id: true,
          subTotal: true,
        },
      });

      if (!existingOrder) {
        throw new NotFoundException('Order not found');
      }

      let newSubTotal = 0;

      // =========================================
      // Prepare New Order Items
      // =========================================
      const newOrderItems = await Promise.all(
        dto.items.map(async (item) => {
          // Fetch Product
          const product = await tx.product.findUnique({
            where: {
              id: item.productId,
            },
          });

          if (!product) {
            throw new NotFoundException(`Product not found: ${item.productId}`);
          }

          // =========================================
          // Fetch Selected Addons
          // =========================================
          const addons = item.addonIds?.length
            ? await tx.addon.findMany({
                where: {
                  id: {
                    in: item.addonIds,
                  },
                  isActive: true,
                },
              })
            : [];

          // Validate Addons
          if (item.addonIds?.length && addons.length !== item.addonIds.length) {
            throw new BadRequestException('One or more addons are invalid');
          }

          // =========================================
          // Calculate Price
          // =========================================
          const addonTotal = addons.reduce(
            (sum, addon) => sum + addon.price,
            0,
          );

          const itemPrice = product.price + addonTotal;

          const total = itemPrice * item.quantity;

          newSubTotal += total;

          return {
            productId: item.productId,
            quantity: item.quantity,
            price: itemPrice,
            total,

            addons: {
              create: addons.map((addon) => ({
                addonId: addon.id,

                // Snapshot values
                name: addon.name,
                price: addon.price,
              })),
            },
          };
        }),
      );

      // =========================================
      // Append New Order Items
      // createMany cannot create nested addons
      // =========================================
      for (const item of newOrderItems) {
        await tx.orderItem.create({
          data: {
            orderId: id,
            ...item,
          },
        });
      }

      // =========================================
      // Recalculate Totals
      // =========================================
      const discountAmount = dto.discountAmount ?? 0;

      const taxAmount = dto.taxAmount ?? 0;

      const subTotal = (existingOrder.subTotal ?? 0) + newSubTotal;

      const totalAmount = subTotal - discountAmount + taxAmount;

      // =========================================
      // Update Order
      // =========================================
      const order = await tx.orders.update({
        where: {
          id,
        },

        data: {
          subTotal,
          discountAmount,
          taxAmount,
          totalAmount,

          paymentMethod: dto.paymentMethod ?? null,
        },

        select: this.orderSelect,
      });

      // =========================================
      // Create New KOT
      // =========================================
      await tx.kot.create({
        data: {
          kotNo: `KOT-${Date.now()}`,
          orderId: id,
          branchId: user.branchId,
          status: 'PENDING',

          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
      });

      return {
        message: 'Order updated successfully',
        data: order,
      };
    });
  }
  async delete(id: string, user: any) {
    const order = await this.prisma.orders.delete({
      where: { id },
      select: this.orderSelect,
    });
    return {
      message: 'Order deleted successfully',
      data: order,
    };
  }
}
