import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async getProductSalesByDateRange(
    branchId: string,
    startDate: Date,
    endDate: Date,
    message: string,
    page: number,
    limit: number,
    skip: number,
  ) {
    const [sales, total] = await this.prisma.$transaction([
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            branchId,
            status: 'COMPLETED',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        _sum: {
          quantity: true,
          total: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: limit,
        skip,
      }),
      this.prisma.orderItem.count({
        where: {
          order: {
            branchId,
            status: 'COMPLETED',
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      }),
    ]);

    const productIds = sales.map((item) => item.productId);

    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      include: {
        category: true,
      },
    });

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    const data = sales.map((sale) => {
      const product = productMap.get(sale.productId);

      const quantitySold = sale._sum?.quantity ?? 0;
      const totalSales = sale._sum?.total ?? 0;

      return {
        productId: sale.productId,
        productName: product?.name,
        price: product?.price,
        image: product?.image,
        category: product?.category?.name,
        quantitySold: quantitySold,
        totalSales: totalSales,
      };
    });

    return {
      success: true,
      message,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductSalesReport(
    branchId: string,
    period: string,
    page: number,
    limit: number,
  ) {
    const now = new Date();

    let startDate: Date;
    let endDate: Date;
    let message: string;

    // safety
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 10)); // max 100

    const skip = (page - 1) * limit;

    switch (period) {
      case 'daily':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        message = 'Daily product sales report fetched successfully';
        break;

      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);

        message = 'Weekly product sales report fetched successfully';
        break;

      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);

        endDate = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );

        message = 'Monthly product sales report fetched successfully';
        break;

      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);

        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

        message = 'Yearly product sales report fetched successfully';
        break;

      default:
        throw new Error('Invalid period. Use daily, weekly, monthly or yearly');
    }

    return this.getProductSalesByDateRange(
      branchId,
      startDate,
      endDate,
      message,
      page,
      limit,
      skip,
    );
  }
}
