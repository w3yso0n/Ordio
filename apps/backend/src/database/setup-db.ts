import { DataSource } from 'typeorm';
import dataSource from './data-source';

async function main() {
  const password = process.env.ORDIO_APP_PASSWORD ?? 'OrdioApp_k7mN2pQ9xL4w';
  const ds = await dataSource.initialize();
  await ds.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ordio_app') THEN
        EXECUTE format('CREATE ROLE ordio_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS', '${password.replace(/'/g, "''")}');
      END IF;
    END
    $$;
  `);
  await ds.query(`GRANT CONNECT ON DATABASE ordio TO ordio_app`);
  await ds.query(`GRANT USAGE ON SCHEMA public TO ordio_app`);
  console.log('ordio_app role ready');
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
