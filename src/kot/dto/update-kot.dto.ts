import { IsEnum, IsNotEmpty } from 'class-validator';

export enum KotStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
}

export class UpdateKotDto {
  @IsEnum(KotStatus)
  @IsNotEmpty()
  status: KotStatus;
}