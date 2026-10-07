import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { loadEnv } from '../env.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  const migrationsFolder = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../drizzle',
  );

  try {
    await migrate(drizzle(sql), { migrationsFolder });
    console.log(`Database migrations applied from ${migrationsFolder}`);
    await sql.end({ timeout: 5 });
  } catch (error) {
    console.error('Database migration failed:', error);
    await sql.end({ timeout: 5 }).catch(() => undefined);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});
