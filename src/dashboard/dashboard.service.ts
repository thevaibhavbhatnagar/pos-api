import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service'; 

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(user: any) {
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
