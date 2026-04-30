import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  //   @Get()
  //   @Roles('ADMIN')
  //   findAll() {
  //     return 'All branches';
  //   }

  @Post('login')
  signin(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
