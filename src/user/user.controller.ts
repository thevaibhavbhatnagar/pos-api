import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { AuthGuard } from "@nestjs/passport";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Controller('api/v1/users')
export class UserController {
    constructor(private readonly userService: UserService) { };

    @UseGuards(AuthGuard('jwt'))
    @Get()
    findAll(@Query("page") page?: number, @Query("limit") limit?: number) {
        return this.userService.findAll(page, limit)
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    findOne(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.userService.findOne(id)
    }


    @UseGuards(AuthGuard('jwt'))
    @Post()
    create(@Body() dto: CreateUserDto) {
        return this.userService.create(dto)
    }


    @UseGuards(AuthGuard('jwt'))
    @Patch(':id')
    update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateUserDto) {
        return this.userService.update(id, dto)
    }


    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    remove(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.userService.remove(id)
    }

}