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
  UseInterceptors,
} from '@nestjs/common';
import { AddonService } from './addon.service';
import { AuthGuard } from '@nestjs/passport';
import { AddAddonDto } from './dto/add-addon.dto';
import { UpdateAddonDto } from './dto/update-addon.dto';
``;
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { DeleteEntity } from 'src/common/deletion-guard/delete-entity.decorator';
import { DeleteRelationInterceptor } from 'src/common/deletion-guard/delete-relation.interceptor';

@Controller('api/v1/addons')
@UseInterceptors(DeleteRelationInterceptor)
export class AddonController {
  constructor(private readonly addonsService: AddonService) {}

  //  PUBLIC endpoint (for login page)
  @Get('lookup')
  getAddonLookup() {
    return this.addonsService.getAddonLookup();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.addonsService.findAll(page, limit);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.addonsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  async addAddon(@Body() dto: AddAddonDto) {
    return this.addonsService.addAddon(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateAddon(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAddonDto,
  ) {
    return this.addonsService.updateAddon(id, dto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  @DeleteEntity('addon')
  async deleteAddon(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.addonsService.deleteAddon(id);
  }
}
