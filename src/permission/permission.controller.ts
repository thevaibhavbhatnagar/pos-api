import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/v1/permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async findAll() {
    return this.permissionService.findAll();
  }
}
