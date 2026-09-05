import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { upsertBranchSchema, upsertCategorySchema, upsertProductSchema, upsertUserSchema, upsertSupplySchema, upsertSupplyExpenseSchema, adminOpenCashSchema, closeCashSchema } from '@ordio/shared';
import { AdminService } from './admin.service';
import { CashService } from '../cash/cash.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthUser } from '../auth/auth-user.decorator';
import type { JwtPayload } from '../auth/auth.types';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly cash: CashService,
  ) {}

  @Get('dashboard/today')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('branches')
  branches() {
    return this.admin.branches();
  }

  @Post('branches')
  createBranch(@AuthUser() auth: JwtPayload, @Body() body: unknown) {
    const dto = upsertBranchSchema.parse(body);
    return this.admin.upsertBranch(auth, undefined, dto);
  }

  @Put('branches/:id')
  updateBranch(@AuthUser() auth: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = upsertBranchSchema.parse(body);
    return this.admin.upsertBranch(auth, id, dto);
  }

  @Delete('branches/:id')
  deleteBranch(@Param('id') id: string) {
    return this.admin.deleteBranch(id);
  }

  @Get('categories')
  categories(@Query('branchId') branchId: string) {
    return this.admin.categories(branchId);
  }

  @Post('categories')
  createCategory(@AuthUser() auth: JwtPayload, @Query('branchId') branchId: string, @Body() body: unknown) {
    const dto = upsertCategorySchema.parse(body);
    return this.admin.createCategory(auth, branchId, dto.name, dto.sortOrder);
  }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: unknown) {
    const dto = upsertCategorySchema.parse(body);
    return this.admin.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.admin.deleteCategory(id);
  }

  @Get('products')
  products(@Query('branchId') branchId: string) {
    return this.admin.products(branchId);
  }

  @Post('products')
  createProduct(@AuthUser() auth: JwtPayload, @Query('branchId') branchId: string, @Body() body: unknown) {
    const dto = upsertProductSchema.parse(body);
    return this.admin.upsertProduct(auth, branchId, undefined, dto);
  }

  @Put('products/:id')
  updateProduct(
    @AuthUser() auth: JwtPayload,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = upsertProductSchema.parse(body);
    return this.admin.upsertProduct(auth, branchId, id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.admin.deleteProduct(id);
  }

  @Get('supplies')
  supplies(@Query('year') year?: string, @Query('month') month?: string) {
    const now = new Date();
    const y = Number(year);
    const m = Number(month);
    return this.admin.supplies(
      Number.isInteger(y) && y >= 2000 ? y : now.getFullYear(),
      Number.isInteger(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1,
    );
  }

  @Post('supplies')
  createSupply(@AuthUser() auth: JwtPayload, @Body() body: unknown) {
    const dto = upsertSupplySchema.parse(body);
    return this.admin.upsertSupply(auth, undefined, dto.name);
  }

  @Put('supplies/:id')
  updateSupply(@AuthUser() auth: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = upsertSupplySchema.parse(body);
    return this.admin.upsertSupply(auth, id, dto.name);
  }

  @Delete('supplies/:id')
  deleteSupply(@Param('id') id: string) {
    return this.admin.deleteSupply(id);
  }

  @Put('supplies/:id/expense')
  upsertSupplyExpense(@AuthUser() auth: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = upsertSupplyExpenseSchema.parse(body);
    return this.admin.upsertSupplyExpense(auth, id, dto);
  }

  @Get('users')
  users() {
    return this.admin.users();
  }

  @Post('users')
  createUser(@AuthUser() auth: JwtPayload, @Body() body: unknown) {
    const dto = upsertUserSchema.parse(body);
    return this.admin.upsertUser(auth, undefined, dto);
  }

  @Put('users/:id')
  updateUser(@AuthUser() auth: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = upsertUserSchema.parse(body);
    return this.admin.upsertUser(auth, id, dto);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id);
  }

  @Get('sales')
  sales() {
    return this.admin.sales();
  }

  @Get('kitchen')
  kitchen(@Query('branchId') branchId: string) {
    if (!branchId) return { tickets: [], openOrders: [] };
    return this.admin.kitchen(branchId);
  }

  @Post('kitchen/:id/printed')
  markKitchenPrinted(@Param('id') id: string) {
    return this.admin.markKitchenPrinted(id);
  }

  @Get('cash')
  cashDay(@Query('branchId') branchId: string) {
    if (!branchId) {
      return { session: null, summary: null, history: [] };
    }
    return this.cash.summaryForBranch(branchId);
  }

  @Post('cash/open')
  openCash(@AuthUser() auth: JwtPayload, @Body() body: unknown) {
    const dto = adminOpenCashSchema.parse(body);
    return this.cash.openForBranch(auth, dto.branchId, dto.openingAmountCents);
  }

  @Post('cash/:id/close')
  closeCash(@AuthUser() auth: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = closeCashSchema.parse(body);
    return this.cash.closeForBranch(id, auth, dto.declaredClosingCents);
  }
}
