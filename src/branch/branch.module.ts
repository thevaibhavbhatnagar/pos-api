import { BranchController } from "./branch.controller";
import { BranchService } from "./branch.service";
import { Module } from "@nestjs/common";

@Module({
    controllers: [BranchController],
    providers: [BranchService],
})
export class BranchModule { }