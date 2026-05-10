import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { AuthGuard } from '@nestjs/passport';
import { AddOrderDto } from './dto/add-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Req } from '@nestjs/common';
// import { RolesGuard } from 'src/auth/roles.guard';
// import { Roles } from 'src/auth/roles.decorator';

@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('lookup')
  getOrderLookup() {
    return this.orderService.getOrderLookup();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  // @Roles('ADMIN')
  findAll(
    @Req() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.orderService.findAll(req.user, page, limit);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  // @Roles('ADMIN')
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @Req() req) {
    return this.orderService.findOne(id, req.user);
  }
  @UseGuards(AuthGuard('jwt'))
  @Post()
  // @Roles('ADMIN')
  async create(@Body() dto: AddOrderDto, @Req() req) {
    return this.orderService.create(dto, req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  // @Roles('ADMIN')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderDto,
    @Req() req,
  ) {
    return this.orderService.update(id, dto, req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  // @Roles('ADMIN')
  async delete(@Param('id', new ParseUUIDPipe()) id: string, @Req() req) {
    return this.orderService.delete(id, req.user);
  }
}
