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
import { KotService } from './kot.service';
import { AuthGuard } from '@nestjs/passport';
import { AddKotDto } from './dto/add-kot.dto';
import { UpdateKotDto } from './dto/update-kot.dto';
// import { RolesGuard } from 'src/auth/roles.guard';
// import { Roles } from 'src/auth/roles.decorator';

@Controller('api/v1/kots')
export class KotController {
  constructor(private readonly kotService: KotService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  // @Roles('ADMIN')
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.kotService.findAll(page, limit);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  // @Roles('ADMIN')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.kotService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  // @Roles('ADMIN')
  async create(@Body() dto: AddKotDto) {
    return this.kotService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  // @Roles('ADMIN')
  async updateProduct(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateKotDto,
  ) {
    return this.kotService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  // @Roles('ADMIN')
  async deleteProduct(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.kotService.delete(id);
  }
}
