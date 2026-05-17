import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

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

    // BRANCH DASHBOARD
    const [totalOrders, pendingKots] =
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
      ]);

    return {
      message: `Welcome ${user.role}`,
      data: {
        dashboardType: 'BRANCH',
        role: user.role,
        totalOrders,
        pendingKots,
      },
    };
  }
}