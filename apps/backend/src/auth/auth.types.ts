export type JwtTyp = 'admin' | 'device' | 'cashier';

export type JwtPayload = {
  sub: string;
  typ: JwtTyp;
  organizationId: string;
  branchId?: string;
  deviceId?: string;
  userId?: string;
  role?: string;
};
