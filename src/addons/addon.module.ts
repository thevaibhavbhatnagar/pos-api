import { AddonController } from './addon.controller';
import { AddonService } from './addon.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [AddonController],
  providers: [AddonService],
})
export class AddonModule {}
