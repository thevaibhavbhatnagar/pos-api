import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { BranchService } from "./branch.service";
import { AuthGuard } from "@nestjs/passport";
import { AddBranchDto } from "./dto/add-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { RolesGuard } from "src/auth/roles.guard";
import { Roles } from "src/auth/roles.decorator";

@Controller('api/v1/branches')
export class BranchController {
    constructor(private readonly branchService: BranchService) { }

    @UseGuards(AuthGuard('jwt'),RolesGuard)
    @Get()
    @Roles('ADMIN')
    findAll(@Query("page") page?: number, @Query("limit") limit?: number) {
        return this.branchService.findAll(page, limit)
    }

    @UseGuards(AuthGuard('jwt'),RolesGuard)
    @Get(':id')
    @Roles('ADMIN')
    findOne(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.branchService.findOne(id)
    }

    @UseGuards(AuthGuard('jwt'),RolesGuard)
    @Post()
    @Roles('ADMIN')
    async addBranch(@Body() dto: AddBranchDto) {
        return this.branchService.addBranch(dto)
    }

    @UseGuards(AuthGuard('jwt'),RolesGuard)
    @Patch(':id')
    @Roles('ADMIN')
    async updateBranch(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateBranchDto) {
        return this.branchService.updateBranch(id, dto)
    }

    @UseGuards(AuthGuard('jwt'),RolesGuard)
    @Delete(':id')
    @Roles('ADMIN')
    async deleteBranch(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.branchService.deleteBranch(id)
    }
}