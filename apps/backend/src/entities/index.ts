import { Organization } from './organization.entity';
import { Branch } from './branch.entity';
import { User } from './user.entity';
import { Device } from './device.entity';
import { IdempotencyKey } from './idempotency-key.entity';
import { Category } from './category.entity';
import { Product } from './product.entity';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Sale } from './sale.entity';
import { SaleItem } from './sale-item.entity';
import { Payment } from './payment.entity';
import { CashRegisterSession } from './cash-register-session.entity';
import { CashMovement } from './cash-movement.entity';
import { PrintJob } from './print-job.entity';
import { BranchDailyCounter } from './branch-daily-counter.entity';
import { Supply } from './supply.entity';
import { SupplyExpense } from './supply-expense.entity';

export const entities = [
  Organization,
  Branch,
  User,
  Device,
  IdempotencyKey,
  Category,
  Product,
  Order,
  OrderItem,
  Sale,
  SaleItem,
  Payment,
  CashRegisterSession,
  CashMovement,
  PrintJob,
  BranchDailyCounter,
  Supply,
  SupplyExpense,
];

export {
  Organization,
  Branch,
  User,
  Device,
  IdempotencyKey,
  Category,
  Product,
  Order,
  OrderItem,
  Sale,
  SaleItem,
  Payment,
  CashRegisterSession,
  CashMovement,
  PrintJob,
  BranchDailyCounter,
  Supply,
  SupplyExpense,
};
