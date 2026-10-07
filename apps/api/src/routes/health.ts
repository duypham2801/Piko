import type { HealthResponseData } from '@wswd/domain';
import type { Context } from 'hono';

import type { Sql } from '../db/client.js';

export interface HealthRouteDependencies {
  sql: Sql;
  version: string;
}

export function healthHandler(dependencies: HealthRouteDependencies) {
  return async (c: Context): Promise<Response> => {
    try {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Health check timed out')), 1000);
      });
      try {
        await Promise.race([dependencies.sql.unsafe('select 1'), timeout]);
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
      const response: HealthResponseData = {
        status: 'ok',
        db: 'ok',
        version: dependencies.version,
      };
      return c.json(response, 200);
    } catch (error) {
      console.error('Health check failed:', error);
      const response: HealthResponseData = {
        status: 'degraded',
        db: 'down',
        version: dependencies.version,
      };
      return c.json(response, 503);
    }
  };
}
