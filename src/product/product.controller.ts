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
import { ProductService } from './product.service';
import { AuthGuard } from '@nestjs/passport';
import { AddProductDto } from './dto/add-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('api/v1/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  //  PUBLIC endpoint (for login page)
  @Get('lookup')
  getProductLookup() {
    return this.productService.getProductLookup();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('category') 
  getProductByCategory(@Query('category_id') category_id: string) {
    return this.productService.getProductByCategory(category_id);
  }
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get()
  @Roles('ADMIN')
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.productService.findAll(page, limit);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  @Roles('ADMIN')
  async addProduct(@Body() dto: AddProductDto) {
    return this.productService.addProduct(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  @Roles('ADMIN')
  async updateProduct(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  @Roles('ADMIN')
  async deleteProduct(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productService.deleteProduct(id);
  }
}
