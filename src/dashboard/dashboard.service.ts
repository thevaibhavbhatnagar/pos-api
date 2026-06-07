import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private getBusinessDayStart(): Date {
    const now = new Date();

    const businessStart = new Date(now);
    businessStart.setHours(19, 0, 0, 0);

    if (now.getHours() < 19) {
      businessStart.setDate(businessStart.getDate() - 1);
    }

    return businessStart;
  }

  async getDashboardStats(user: any) {
    // CENTRAL DASHBOARD
    if (!user.branchId) {
      const totalBranches = await this.prisma.branch.count();

      return {
        message: `Welcome ${user.role}`,
        data: {
          dashboardType: 'CENTRAL',
          role: user.role,
          totalBranches,
        },
      };
    }

    const businessDayStart = this.getBusinessDayStart();

    const [totalOrders, pendingKots, items] = await this.prisma.$transaction([
      this.prisma.orders.count({
        where: {
          branchId: user.branchId,
          createdAt: {
            gte: businessDayStart,
          },
        },
      }),

      this.prisma.kot.count({
        where: {
          order: {
            branchId: user.branchId,
            createdAt: {
              gte: businessDayStart,
            },
          },
          status: 'PENDING',
        },
      }),

      this.prisma.orderItem.findMany({
        where: {
          order: {
            branchId: user.branchId,
            status: 'COMPLETED',
            createdAt: {
              gte: businessDayStart,
            },
          },
        },
        select: {
          quantity: true,
          product: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const categoryMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        quantitySold: number;
      }
    >();

    for (const item of items) {
      const category = item.product?.category;

      if (!category) continue;

      const existing = categoryMap.get(category.id);

      if (existing) {
        existing.quantitySold += item.quantity;
      } else {
        categoryMap.set(category.id, {
          categoryId: category.id,
          categoryName: category.name,
          quantitySold: item.quantity,
        });
      }
    }

    const categorySales = Array.from(categoryMap.values()).sort(
      (a, b) => b.quantitySold - a.quantitySold,
    );

    const topCategory = categorySales[0] ?? null;

    return {
      message: `Welcome ${user.role}`,
      data: {
        dashboardType: 'BRANCH',
        role: user.role,
        totalOrders,
        pendingKots,

        topCategory,

        categorySales,
      },
    };
  }
}