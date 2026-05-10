import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class AddKotDto {
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  items: AddKotItemsDto[];
}

class AddKotItemsDto {
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
