import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { payOrderSchema, upsertOrderSchema } from '@ordio/shared';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import type { JwtPayload } from '../auth/auth.types';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('open')
  listOpen(@AuthUser() auth: JwtPayload) {
    return this.orders.listOpen(auth);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @AuthUser() auth: JwtPayload) {
    return this.orders.getOne(id, auth);
  }

  @Put(':id')
  upsert(@Param('id') id: string, @Body() body: unknown, @AuthUser() auth: JwtPayload) {
    const dto = upsertOrderSchema.parse(body);
    return this.orders.upsert(id, dto, auth);
  }

  @Post(':id/send')
  send(@Param('id') id: string, @AuthUser() auth: JwtPayload) {
    return this.orders.send(id, auth);
  }

  @Post(':id/void')
  voidOrder(@Param('id') id: string, @AuthUser() auth: JwtPayload) {
    return this.orders.voidOrder(id, auth);
  }

  @Post(':id/pay')
  pay(@Param('id') id: string, @Body() body: unknown, @AuthUser() auth: JwtPayload) {
    const dto = payOrderSchema.parse(body);
    return this.orders.pay(id, dto, auth);
  }
}
