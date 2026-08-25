import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const devicePairSchema = z.object({
  activationCode: z.string().min(4),
  name: z.string().min(1),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
});

export const pinLoginSchema = z.object({
  userId: z.string().uuid(),
  pin: z.string().min(4).max(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const orderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  nameSnapshot: z.string().min(1),
  unitPriceCents: z.number().int().nonnegative(),
  qty: z.number().int().nonnegative(),
  note: z.string().nullable().optional(),
});

export const upsertOrderSchema = z.object({
  branchId: z.string().uuid(),
  cashierUserId: z.string().uuid(),
  cashRegisterSessionId: z.string().uuid().nullable().optional(),
  tableLabel: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  clientCreatedAt: z.string().datetime(),
  items: z.array(orderItemSchema).min(1),
});

export const payOrderSchema = z.object({
  method: z
    .enum(['cash', 'card', 'transfer'])
    .transform((value) => (value === 'card' ? 'transfer' : value)),
  amountCents: z.number().int().positive(),
  cashRegisterSessionId: z.string().uuid(),
});

export const openCashSchema = z.object({
  openingAmountCents: z.number().int().nonnegative(),
});

export const adminOpenCashSchema = z.object({
  branchId: z.string().uuid(),
  openingAmountCents: z.number().int().nonnegative(),
});

export const closeCashSchema = z.object({
  declaredClosingCents: z.number().int().nonnegative(),
});

export const cashMovementSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'expense']),
  amountCents: z.number().int().positive(),
  note: z.string().nullable().optional(),
});

export const upsertProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  sku: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isPinned: z.boolean().optional(),
});

export const pinProductSchema = z.object({
  isPinned: z.boolean(),
});

export const upsertCategorySchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const upsertUserSchema = z.object({
  displayName: z.string().min(1),
  role: z.enum(['owner', 'admin', 'cashier']),
  email: z.string().email().nullable().optional(),
  password: z.string().min(8).optional(),
  pin: z.string().min(4).max(8).optional(),
  branchId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const upsertBranchSchema = z.object({
  name: z.string().min(1),
  activationCode: z.string().min(4).max(32).optional(),
  address: z.string().nullable().optional(),
});
