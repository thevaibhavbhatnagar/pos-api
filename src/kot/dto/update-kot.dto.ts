import { IsEnum, IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

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

  items: UpdateKotItemsDto[];
}

class UpdateKotItemsDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  price: number;
}
