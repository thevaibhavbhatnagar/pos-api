import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleService } from './role.service';
import { AuthGuard } from '@nestjs/passport';
import { DeleteEntity } from '../common/deletion-guard/delete-entity.decorator';
import { DeleteRelationInterceptor } from '../common/deletion-guard/delete-relation.interceptor';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('api/v1/roles')
@UseInterceptors(DeleteRelationInterceptor) // applies to all handlers in this controller
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @UseGuards(AuthGuard('jwt'),RolesGuard)
  @Post()
  @Roles('ADMIN')
  async create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.createRole(createRoleDto);
  }

  @UseGuards(AuthGuard('jwt'),RolesGuard)
  @Get()
  @Roles('ADMIN')
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.roleService.findAll(page, limit);
  }

  @UseGuards(AuthGuard('jwt'),RolesGuard)
  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.roleService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'),RolesGuard)
  @Patch(':id')
  @Roles('ADMIN')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.updateRole(id, updateRoleDto);
  }

  @UseGuards(AuthGuard('jwt'),RolesGuard)
  @Delete(':id')
  @Roles('ADMIN')
  @DeleteEntity('role')
  async deleteRole(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.roleService.deleteRole(id);
  }
}
