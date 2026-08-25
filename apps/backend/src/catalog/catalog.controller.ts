import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { pinProductSchema } from '@ordio/shared';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import type { JwtPayload } from '../auth/auth.types';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('snapshot')
  snapshot(@AuthUser() auth: JwtPayload, @Query('updatedSince') updatedSince?: string) {
    const branchId = auth.branchId;
    if (!branchId) {
      return this.catalog.snapshot(auth.organizationId, updatedSince);
    }
    return this.catalog.snapshot(branchId, updatedSince);
  }

  @Patch('products/:id/pin')
  pin(@Param('id') id: string, @Body() body: unknown) {
    const dto = pinProductSchema.parse(body);
    return this.catalog.setPinned(id, dto.isPinned);
  }
}
