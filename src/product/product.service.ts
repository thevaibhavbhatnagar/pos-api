import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AddProductDto } from './dto/add-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ensureExists } from '../common/prisma/ensure-exists';
import { Prisma } from 'src/generated/prisma/client';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    console.log('CLOUD NAME:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API KEY:', process.env.CLOUDINARY_API_KEY);
  }

  // Reusable select (same style as Company/Publisher)
  private productSelect = {
    id: true,
    name: true,
    categoryId: true,
    image: true,
    imagePublicId: true,
    category: { select: { id: true, name: true } },
    isKotRequired: true,
    price: true,
    isActive: true,
    createdAt: true,
  } as const;

  private ensureCategoriesExists(tx: Prisma.TransactionClient, id: string) {
    return ensureExists(
      tx.category.findFirst({
        where: { id, isActive: true },
        select: { id: true },
      }),
      'category not found',
    );
  }

  async getProductLookup() {
    const products = await this.prisma.product.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Public products fetched successfully',
      data: products,
    };
  }

  async getProductByCategory(category_id: string) {
    const products = await this.prisma.product.findMany({
      where: category_id ? { categoryId: category_id } : {},
      select: {
        id: true,
        name: true,
        image: true,
        imagePublicId: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
        isKotRequired: true,
        price: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      message: 'Category products fetched successfully',
      data: products,
    };
  }

  async findAll(page: number = 1, limit: number = 10) {
    // safety
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 10)); // max 100

    const skip = (page - 1) * limit;

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        select: this.productSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.product.count(),
    ]);

    return {
      message: 'Products fetched successfully',
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: this.productSelect,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      message: 'Product fetched successfully',
      data: product,
    };
  }

  async addProduct(dto: AddProductDto) {
    await this.ensureCategoriesExists(this.prisma, dto.categoryId);

    const product = await this.prisma.product.create({
      data: dto,
      select: this.productSelect,
    });

    return {
      message: 'Product created successfully',
      data: product,
    };
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.update({
      where: { id },
      data: dto,
      select: this.productSelect,
    });
    return {
      message: 'Product updated successfully',
      data: product,
    };
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.delete({
      where: { id },
      select: this.productSelect,
    });
    return {
      message: 'Product deleted successfully',
      data: product,
    };
  }

  async uploadImage(file: Express.Multer.File) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'products',
          },
          (error, result) => {
            if (error) {
              reject(error);
            }

            resolve({
              url: result?.secure_url,
              public_id: result?.public_id,
            });
          },
        )
        .end(file.buffer);
    });
  }
}
