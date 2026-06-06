import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './report.service';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('products/:branch_id')
  async getProductSalesReport(
    @Param('branch_id') branchId: string,
    @Query('period') period: string = 'daily',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.reportsService.getProductSalesReport(
      branchId,
      period,
      page,
      limit
    );
  }
}