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
    productAddons: {
      select: {
        addon: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    },
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
      select: this.productSelect,
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
    const { addonIds = [], ...productData } = dto;

    await this.ensureCategoriesExists(this.prisma, productData.categoryId);

    // Validate addons
    if (addonIds.length) {
      const addonsCount = await this.prisma.addon.count({
        where: {
          id: {
            in: addonIds,
          },
          isActive: true,
        },
      });

      if (addonsCount !== addonIds.length) {
        throw new BadRequestException('One or more addons are invalid');
      }
    }

    const product = await this.prisma.product.create({
      data: {
        ...productData,

        productAddons: {
          create: addonIds.map((addonId) => ({
            addonId,
          })),
        },
      },
      select: this.productSelect,
    });

    return {
      message: 'Product created successfully',
      data: product,
    };
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const { addonIds = [], ...productData } = dto;

    // Ensure product exists
    await ensureExists(
      this.prisma.product.findUnique({
        where: { id },
        select: { id: true },
      }),
      'Product not found',
    );

    // Validate category if user is changing it
    if (productData.categoryId) {
      await this.ensureCategoriesExists(this.prisma, productData.categoryId);
    }

    // Validate all provided addons exist and are active
    if (addonIds.length) {
      const addonsCount = await this.prisma.addon.count({
        where: {
          id: {
            in: addonIds,
          },
          isActive: true,
        },
      });

      if (addonsCount !== addonIds.length) {
        throw new BadRequestException('One or more addons are invalid');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Update product details
      await tx.product.update({
        where: { id },
        data: productData,
      });

      // Fetch currently linked addons
      const existing = await tx.productAddon.findMany({
        where: { productId: id },
        select: { addonId: true },
      });

      // Convert current addon ids into Set for fast lookup
      const existingIds = new Set(existing.map((item) => item.addonId));

      // Convert incoming addon ids into Set
      const newIds = new Set(addonIds);

      // Addons that are newly selected by the user
      const toAdd = addonIds.filter((addonId) => !existingIds.has(addonId));

      // Addons that were previously linked but now removed
      const toRemove = [...existingIds].filter(
        (addonId) => !newIds.has(addonId),
      );

      // Remove unselected addon mappings
      if (toRemove.length) {
        await tx.productAddon.deleteMany({
          where: {
            productId: id,
            addonId: {
              in: toRemove,
            },
          },
        });
      }

      // Create mappings for newly added addons
      if (toAdd.length) {
        await tx.productAddon.createMany({
          data: toAdd.map((addonId) => ({
            productId: id,
            addonId,
          })),
        });
      }
    });

    // Fetch updated product with relations
    const updatedProduct = await this.prisma.product.findUnique({
      where: { id },
      select: this.productSelect,
    });

    return {
      message: 'Product updated successfully',
      data: updatedProduct,
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
