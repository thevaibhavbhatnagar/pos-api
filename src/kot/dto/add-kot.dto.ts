import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddKotDto {
  @IsUUID()
  @IsNotEmpty()
  orderId: string;
}
