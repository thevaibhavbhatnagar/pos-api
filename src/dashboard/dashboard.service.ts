import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(user: any) {
    // Admin should not access branch dashboard
    if (!user.branchId) {
      throw new ForbiddenException(
        'Dashboard is only available for branch users',
      );
    }

    const [totalOrders, pendingKots, totalBranches] =
      await this.prisma.$transaction([
        this.prisma.orders.count({
          where: {
            branchId: user.branchId,
          },
        }),

        this.prisma.kot.count({
          where: {
            order: {
              branchId: user.branchId,
            },
            status: 'PENDING',
          },
        }),

        this.prisma.branch.count(),
      ]);

    return {
      message: 'Dashboard stats fetched successfully',
      data: {
        totalOrders,
        pendingKots,
        totalBranches,
      },
    };
  }
}
