import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AddCategoryDto } from './dto/add-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ensureExists } from '../common/prisma/ensure-exists';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  // Reusable select (same style as Company/Publisher)
  private categorySelect = {
    id: true,
    name: true,
    isActive: true,
    createdAt: true,
  } as const;

  async getCategoryLookup() {
    const categories = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Public categories fetched successfully',
      data: categories,
    };
  }

  async findAll(page: number = 1, limit: number = 10) {
    // safety
    page = Math.max(1, Number(page) || 1);
    limit = Math.min(100, Math.max(1, Number(limit) || 10)); // max 100

    const skip = (page - 1) * limit;

    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.category.count(),
    ]);

    return {
      message: 'Categories fetched successfully',
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: this.categorySelect,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return {
      message: 'Category fetched successfully',
      data: category,
    };
  }

  async addCategory(dto: AddCategoryDto) {
    const category = await this.prisma.category.create({
      data: dto, // since dto keys match
      select: this.categorySelect,
    });

    return {
      message: 'Category created successfully',
      data: category,
    };
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.update({
      where: { id },
      data: dto,
      select: this.categorySelect,
    });
    return {
      message: 'Category updated successfully',
      data: category,
    };
  }

  async deleteCategory(id: string) {
  
    const category = await this.prisma.category.delete({
      where: { id },
      select: this.categorySelect,
    });
    return {
      message: 'Category deleted successfully',
      data: category,
    };
  }
}
