import { KotController } from './kot.controller';
import { KotService } from './kot.service';
import { Module } from '@nestjs/common';

@Module({
  controllers: [KotController],
  providers: [KotService],
})
export class KotModule {}
