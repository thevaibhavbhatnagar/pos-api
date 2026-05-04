import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
