import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaService } from 'src/prisma.service';

import { LoginDto } from './dto/login.dto';

// Make this service injectable so it can be used in controllers
@Injectable()
export class AuthService {
  // Inject PrismaService and JwtService into AuthService
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Login function to authenticate an existing user
  async login(dto: LoginDto) {
    // Find user in the database by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    // If password is invalid, throw unauthorized exception
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    // Generate JWT access token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role.name,
      branchId: user.branchId,
    });

    // Return success message and JWT access token
    return {
      message: 'Login Successful',
      accessToken: token,
    };
  }
}
