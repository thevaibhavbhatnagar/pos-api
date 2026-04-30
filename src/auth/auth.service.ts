import { JwtService } from "@nestjs/jwt";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";

import * as bcrypt from 'bcrypt';

import { PrismaService } from "src/prisma.service";

import { LoginDto } from "./dto/login.dto";
import { SignUpDto } from "./dto/signup.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

// Make this service injectable so it can be used in controllers
@Injectable()
export class AuthService {

    // Inject PrismaService and JwtService into AuthService
    constructor(private prisma: PrismaService, private jwtService: JwtService) { }

    // Signup function to register a new user
    async signup(dto: SignUpDto) {

        // Check if a user with the given email already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        // If user exists, throw a conflict exception
        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        // Hash the user's password before saving it to the database
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Create a new user in the database with the hashed password
        await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: hashedPassword,

                otpCode: otp,
                otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
                isVerified: false,

            }
        })

        // Return success message and JWT access token
        return {
            message: 'Signup successful. Please verify OTP',
            //phase 1
            // message: 'User registered successfully',
            // accessToken: token
            // userId: user.id, // optionally return the user id
        }
    }

    async verifySignupOtp(dto: VerifyOtpDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } })

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // 🔥 VERY IMPORTANT
        if (user.isVerified) {
            throw new UnauthorizedException('Account already verified');
        }

        if (
            !user.otpCode ||
            user.otpCode !== dto.otp ||
            !user.otpExpiry ||
            user.otpExpiry < new Date()
        ) {
            throw new UnauthorizedException('Invalid or expired OTP');
        }


        // if (
        //     !user ||                    // 1️⃣ User does not exist in DB
        //     !user.otpCode ||            // 2️⃣ No OTP stored for the user
        //     user.otpCode !== dto.otp || // 3️⃣ Entered OTP does not match stored OTP
        //     !user.otpExpiry ||          // 4️⃣ OTP expiry time is missing
        //     user.otpExpiry < new Date() // 5️⃣ OTP has expired
        // ) {
        //     throw new UnauthorizedException('Invalid or expired OTP');
        // }

        // Clear OTP after success
        await this.prisma.user.update({ where: { email: dto.email }, data: { isVerified: true, otpCode: null, otpExpiry: null, }, });

        // Generate JWT access token
        const token = this.jwtService.sign({ sub: user.id, email: user.email });
        //  const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId });


        return {
            message: 'OTP verified successfully',
            accessToken: token,
        };
    }

    // Login function to authenticate an existing user
    async login(dto: LoginDto) {

        // Find user in the database by email
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } })

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isVerified) {
            throw new UnauthorizedException('Please verify your account');
        }

        // Compare provided password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(dto.password, user.password)

        // If password is invalid, throw unauthorized exception
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid Credentials')
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await this.prisma.user.update({
            where: { email: dto.email },
            data: {
                otpCode: otp,
                otpExpiry: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
            }
        })

        // Generate JWT token for the authenticated user
        // const token = this.jwtService.sign({ sub: user.id, email: user.email });
        // const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId });


        // Return success message and JWT access token
        return {
            message: 'OTP sent successfully',

            // phase 2
            // message: 'Login Successful',
            // accessToken: token

            //phase 1
            // user: {
            //     id: user.id,
            //     email: user.email,
            //     name: user.name,
            // } // optionally return user details
        }
    }

    async verifyLoginOtp(dto: VerifyOtpDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } })

        if (
            !user ||                    // 1️⃣ User does not exist in DB
            !user.otpCode ||            // 2️⃣ No OTP stored for the user
            user.otpCode !== dto.otp || // 3️⃣ Entered OTP does not match stored OTP
            !user.otpExpiry ||          // 4️⃣ OTP expiry time is missing
            user.otpExpiry < new Date() // 5️⃣ OTP has expired
        ) {
            throw new UnauthorizedException('Invalid or expired OTP');
        }

        // if (
        //     !user ||                    // 1️⃣ User does not exist in DB
        //     !user.otpCode ||            // 2️⃣ No OTP stored for the user
        //     user.otpCode !== dto.otp || // 3️⃣ Entered OTP does not match stored OTP
        //     !user.otpExpiry ||          // 4️⃣ OTP expiry time is missing
        //     user.otpExpiry < new Date() // 5️⃣ OTP has expired
        // ) {
        //     throw new UnauthorizedException('Invalid or expired OTP');
        // }

        // Clear OTP after success
        await this.prisma.user.update({ where: { email: dto.email }, data: { otpCode: null, otpExpiry: null, }, });

        // Generate JWT access token
        const token = this.jwtService.sign({ sub: user.id, email: user.email });
        //  const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId });


        return {
            message: 'OTP verified successfully',
            accessToken: token,
        };
    }
}
