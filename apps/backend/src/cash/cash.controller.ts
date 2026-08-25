import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { cashMovementSchema } from '@ordio/shared';
import { CashService } from './cash.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import type { JwtPayload } from '../auth/auth.types';

@Controller('cash/sessions')
@UseGuards(JwtAuthGuard)
export class CashController {
  constructor(private readonly cash: CashService) {}

  @Get('current')
  current(@AuthUser() auth: JwtPayload) {
    return this.cash.current(auth);
  }

  @Post(':id/movements')
  movement(@Param('id') id: string, @AuthUser() auth: JwtPayload, @Body() body: unknown) {
    const dto = cashMovementSchema.parse(body);
    return this.cash.addMovement(id, auth, dto);
  }
}
