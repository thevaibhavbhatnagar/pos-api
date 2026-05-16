import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/v1/session')
export class SessionController {
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getSession(@Req() req: any) {
    return {
      ok: true,
      authenticated: true,
      userId: req.user?.userId, // Adjusted to match JwtStrategy return
    };
  }
}
