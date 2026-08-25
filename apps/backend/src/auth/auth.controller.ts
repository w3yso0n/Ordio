import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  adminLoginSchema,
  devicePairSchema,
  pinLoginSchema,
  refreshSchema,
} from '@ordio/shared';
import { AuthService } from './auth.service';
import { AuthUser } from './auth-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('admin/login')
  adminLogin(@Body() body: unknown) {
    const dto = adminLoginSchema.parse(body);
    return this.auth.adminLogin(dto.email, dto.password);
  }

  @Post('device/pair')
  pair(@Body() body: unknown) {
    const dto = devicePairSchema.parse(body);
    return this.auth.pairDevice(dto.activationCode, dto.name, dto.platform);
  }

  @Post('pin')
  @UseGuards(JwtAuthGuard)
  pin(@AuthUser() user: JwtPayload, @Body() body: unknown) {
    const dto = pinLoginSchema.parse(body);
    return this.auth.pinLogin(user, dto.userId, dto.pin);
  }

  @Post('refresh')
  refresh(@Body() body: unknown) {
    const dto = refreshSchema.parse(body);
    return this.auth.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@AuthUser() user: JwtPayload) {
    return this.auth.me(user);
  }
}
