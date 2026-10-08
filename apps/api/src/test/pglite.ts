import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as schema from '../db/schema.js';

export async function createTestDatabase() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const migrationsFolder = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../drizzle',
  );
  await migrate(db, { migrationsFolder });
  return {
    db,
    close: (): Promise<void> => client.close(),
  };
}
