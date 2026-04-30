import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { SignUpDto } from "./dto/signup.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

// import { AuthGuard } from "@nestjs/passport";

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    //   @Get()
    //   @Roles('ADMIN')
    //   findAll() {
    //     return 'All branches';
    //   }

    // 🔹 STEP 1: Signin → send OTP
    @Post('login')
    signin(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    // 🔹 STEP 2: Verify signin OTP
    @Post('login/verify-otp')
    verifySigninOtp(@Body() dto: VerifyOtpDto) {
        return this.authService.verifyLoginOtp(dto);
    }

    // STEP 1: Signup → send OTP
    @Post('signup')
    signup(@Body() dto: SignUpDto) {
        return this.authService.signup(dto)
    }

    // STEP 2: Verify signup OTP
    @Post('signup/verify-otp')
    verifySignupOtp(@Body() dto: VerifyOtpDto) {
        return this.authService.verifySignupOtp(dto);
    }

}
// Example GET route to get current user profile
// @UseGuards(AuthGuard('jwt')) // protect route with JWT
// @Get('profile')
// getProfile(@Request() req) {
//     return req.user; // user info will be available from JWT
// }