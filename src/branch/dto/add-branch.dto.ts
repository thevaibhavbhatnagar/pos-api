import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class AddBranchDto {
    @IsString()
    @IsNotEmpty()
    name: string; 
}
