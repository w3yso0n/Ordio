import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('RLS + auth bootstrap', () => {
  let app: INestApplication;
  let adminDs: DataSource;

  beforeAll(async () => {
    const runtimeUrl = process.env.DATABASE_URL ?? '';
    expect(runtimeUrl).toContain('ordio_app');
    expect(runtimeUrl).not.toContain('postgres:');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    adminDs = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_ADMIN_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });
    await adminDs.initialize();
  });

  afterAll(async () => {
    await app.close();
    if (adminDs?.isInitialized) await adminDs.destroy();
  });

  it('login and pair work as ordio_app via SECURITY DEFINER', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/admin/login')
      .send({ email: 'owner@ordio.local', password: 'ordio-admin' });
    expect(login.status).toBe(201);
    expect(login.body.accessToken).toBeDefined();

    const pair = await request(app.getHttpServer())
      .post('/api/auth/device/pair')
      .send({ activationCode: 'INDIO', name: 'e2e-tablet', platform: 'android' });
    expect(pair.status).toBe(201);
    expect(pair.body.device.id).toBeDefined();
  });

  it('org A cannot read org B', async () => {
    const loginA = await request(app.getHttpServer())
      .post('/api/auth/admin/login')
      .send({ email: 'owner@ordio.local', password: 'ordio-admin' });
    const loginB = await request(app.getHttpServer())
      .post('/api/auth/admin/login')
      .send({ email: 'owner-b@ordio.local', password: 'ordio-admin' });

    const usersA = await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${loginA.body.accessToken}`);
    const usersB = await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${loginB.body.accessToken}`);

    const emailsA = (usersA.body as Array<{ email: string | null }>).map((u) => u.email);
    const emailsB = (usersB.body as Array<{ email: string | null }>).map((u) => u.email);
    expect(emailsA).toContain('owner@ordio.local');
    expect(emailsA).not.toContain('owner-b@ordio.local');
    expect(emailsB).toContain('owner-b@ordio.local');
    expect(emailsB).not.toContain('owner@ordio.local');
  });

  it('SET LOCAL on another connection does not leak tenant', async () => {
    const orgs = await adminDs.query(`SELECT id, slug FROM organizations`);
    const orgA = orgs.find((o: { slug: string }) => o.slug === 'ordio-demo');
    const appDs = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: false,
    });
    await appDs.initialize();
    const qr1 = appDs.createQueryRunner();
    const qr2 = appDs.createQueryRunner();
    await qr1.connect();
    await qr2.connect();
    await qr1.startTransaction();
    await qr2.startTransaction();
    await qr1.query(`SELECT set_config('app.current_org_id', $1, true)`, [orgA.id]);
    const leaked = await qr2.query(`SELECT count(*)::int AS n FROM users`);
    expect(leaked[0].n).toBe(0);
    await qr1.rollbackTransaction();
    await qr2.rollbackTransaction();
    await qr1.release();
    await qr2.release();
    await appDs.destroy();
  });
});
