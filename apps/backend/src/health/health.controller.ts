import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    const result = await this.dataSource.query('SELECT 1 AS ok');

    return {
      status: 'ok',
      database: this.dataSource.isInitialized ? 'connected' : 'disconnected',
      ping: result?.[0]?.ok === 1 ? 'ok' : 'error',
    };
  }
}
