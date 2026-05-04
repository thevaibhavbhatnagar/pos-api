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
import { CategoryService } from './category.service';
import { AuthGuard } from '@nestjs/passport';
import { AddCategoryDto } from './dto/add-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('api/v1/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  //  PUBLIC endpoint (for login page)
  @Get('lookup')
  getCategoryLookup() {
    return this.categoryService.getCategoryLookup();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get()
  @Roles('ADMIN')
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.categoryService.findAll(page, limit);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoryService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  @Roles('ADMIN')
  async addCategory(@Body() dto: AddCategoryDto) {
    return this.categoryService.addCategory(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  @Roles('ADMIN')
  async updateCategory(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.updateCategory(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  @Roles('ADMIN')
  async deleteCategory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoryService.deleteCategory(id);
  }
}
