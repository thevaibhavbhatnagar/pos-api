import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}
  
  private getBusinessDayStart(): Date {
    const now = new Date();

    const businessStart = new Date(now);
    businessStart.setHours(19, 0, 0, 0); // 7 PM

    // Before 7 PM => business day started yesterday at 7 PM
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

    // BRANCH DASHBOARD
    const [totalOrders, pendingKots] = await this.prisma.$transaction([
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
