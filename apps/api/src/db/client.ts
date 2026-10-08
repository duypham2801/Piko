import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import postgres from 'postgres';

import * as schema from './schema.js';

export function createDb(databaseUrl: string, options: { max?: number } = {}) {
  const sql = postgres(databaseUrl, { max: options.max ?? 10 });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Sql = ReturnType<typeof createDb>['sql'];
