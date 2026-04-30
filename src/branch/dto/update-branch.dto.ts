import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class UpdateBranchDto {
    
    @IsString()
    @IsNotEmpty()
    name: string;
}
