// src/role/dto/create-role.dto.ts
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string; // "ADMIN"

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissionIds : string[]; // ["book:view","book:create"]
}
