import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ensureExists } from 'src/common/prisma/ensure-exists';

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
    const [sales, totalGroups] = await this.prisma.$transaction([
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
        orderBy: {
          productId: 'asc',
        },
      }),
    ]);

    const total = totalGroups.length;
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
        productName: product?.name ?? 'Unknown Product',
        price: product?.price ?? 0,
        image: product?.image ?? null,
        category: product?.category?.name ?? 'Uncategorized',
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
    // Validate branch exists
    await ensureExists(
      this.prisma.branch.findUnique({
        where: { id: branchId },
      }),
      'Branch not found',
    );

    const now = new Date();

    let startDate: Date;
    let endDate: Date;
    let message: string;

    // safety
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 10)); // max 100

    const skip = (page - 1) * limit;

    const sanitizedPeriod = (period || '').toLowerCase().trim();

    switch (sanitizedPeriod) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(now);
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
        throw new BadRequestException(
          'Invalid period. Use daily, weekly, monthly or yearly',
        );
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

