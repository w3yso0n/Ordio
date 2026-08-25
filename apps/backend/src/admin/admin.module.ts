import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EventsModule } from '../events/events.module';
import { CashModule } from '../cash/cash.module';

@Module({
  imports: [EventsModule, CashModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
