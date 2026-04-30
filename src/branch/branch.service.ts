import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import { AddBranchDto } from "./dto/add-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { ensureExists } from "../common/prisma/ensure-exists";

@Injectable()
export class BranchService {
    constructor(private prisma: PrismaService) { }

    // Reusable select (same style as Company/Publisher)
    private branchSelect = {
        id: true,
        name: true,
        board: true,
        companyId: true,
        createdAt: true,
    } as const;

    // Ensure branch exists
    // private async ensureBranchExists(id: string) {
    //     const exists = await this.prisma.branch.findUnique({
    //         where: { id },
    //         select: { id: true },
    //     });

    //     if (!exists) {
    //         throw new NotFoundException("Branch not found");
    //     }
    // }


    async findAll(page: number = 1, limit: number = 10) {
        // safety
        page = Math.max(1, Number(page) || 1);
        limit = Math.min(100, Math.max(1, Number(limit) || 10)); // max 100

        const skip = (page - 1) * limit;

        const [branches, total] = await this.prisma.$transaction([
            this.prisma.branch.findMany({
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip,
            }),
            this.prisma.branch.count(),
        ])

        return {
            message: "Branches fetched successfully",
            data: branches,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const branch = await this.prisma.branch.findUnique({
            where: { id },
            select: this.branchSelect
        })

        if (!branch) {
            throw new NotFoundException("Branch not found");
        }

        return {
            message: "Branch fetched successfully",
            data: branch,
        };
    }

    async addBranch(dto: AddBranchDto) { 

        const branch = await this.prisma.branch.create({
            data: dto, // since dto keys match
            select: this.branchSelect,
        });

        return {
            message: "Branch created successfully",
            data: branch,
        };
    }


    async updateBranch(id: string, dto: UpdateBranchDto) {
        const branch = await this.prisma.branch.update({
            where: { id },
            data: dto,
            select: this.branchSelect
        })
        return {
            message: "Branch updated successfully",
            data: branch,
        };
    }

    async deleteBranch(id: string) {

        // branch validation
        // await this.ensureBranchExists(id);

        const branch = await this.prisma.branch.delete({
            where: { id },
            select: this.branchSelect
        })
        return {
            message: "Branch deleted successfully",
            data: branch,
        };
    }
}