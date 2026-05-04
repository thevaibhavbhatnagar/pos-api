import { IsBoolean, IsNotEmpty, IsString, IsUUID } from "class-validator";

export class AddCategoryDto {
    @IsString()
    @IsNotEmpty()
    name: string; 

    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;
}
