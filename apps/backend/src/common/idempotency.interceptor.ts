import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, from, of } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { QueryFailedError } from 'typeorm';
import { IdempotencyKey } from '../entities';
import { getTenantManager } from '../tenant/tenant-context';
import { JwtPayload } from '../auth/auth.types';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { auth?: JwtPayload }>();
    const res = http.getResponse<Response>();
    const method = req.method.toUpperCase();
    if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') {
      return next.handle();
    }

    const key = req.header('Idempotency-Key') ?? req.header('idempotency-key');
    if (!key || !req.auth?.organizationId) {
      return next.handle();
    }

    const manager = getTenantManager();
    const existing = await manager.findOne(IdempotencyKey, {
      where: { organizationId: req.auth.organizationId, key },
    });
    if (existing) {
      res.status(existing.responseStatus);
      return of(existing.responseBody);
    }

    return next.handle().pipe(
      concatMap((body) =>
        from(
          this.persistKey(manager, {
            organizationId: req.auth!.organizationId,
            key,
            method,
            path: req.path,
            responseStatus: res.statusCode || 201,
            responseBody: body ?? null,
          }).then(() => body),
        ),
      ),
    );
  }

  private async persistKey(
    manager: ReturnType<typeof getTenantManager>,
    row: {
      organizationId: string;
      key: string;
      method: string;
      path: string;
      responseStatus: number;
      responseBody: unknown;
    },
  ) {
    try {
      await manager.save(manager.create(IdempotencyKey, row));
    } catch (err) {
      if (err instanceof QueryFailedError && (err as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505') {
        return;
      }
      throw err;
    }
  }
}
