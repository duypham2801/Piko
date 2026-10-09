import { csrf } from 'hono/csrf';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { bodyLimit } from 'hono/body-limit';

import { FixedWindowRateLimiter } from './auth/rate-limit.js';
import { createSessionMiddleware, type AppEnv } from './auth/session.middleware.js';
import type { Database } from './db/client.js';
import { createOnError, notFound, HttpError } from './lib/errors.js';
import { healthHandler, type HealthSql } from './routes/health.js';
import { meHandler } from './routes/me.js';
import { createDecisionRoutes } from './routes/decisions.js';
import { createHistoryRoutes } from './routes/history.js';
import { createPublicShareRoutes, createShareRoutes } from './routes/shares.js';

export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  appOrigin: string;
  cookieSecure: boolean;
  trustProxy: boolean;
  appVersion: string;
  guestRateLimitPerHour: number;
}

export interface AppDependencies {
  db: Database;
  sql: HealthSql;
  limiter?: FixedWindowRateLimiter;
}

export function createApp(config: AppConfig, dependencies: AppDependencies): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  const limiter =
    dependencies.limiter ?? new FixedWindowRateLimiter({ limit: config.guestRateLimitPerHour });

  if (config.nodeEnv === 'development') {
    app.use('*', logger());
  }

  app.use('/api/*', async (c, next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      const contentType = c.req.header('Content-Type')?.split(';')[0]?.trim().toLowerCase();
      if (contentType !== 'application/json') {
        throw new HttpError(415, 'unsupported_media_type', 'Mutations must use application/json.');
      }
      if (c.req.header('Origin') !== config.appOrigin) {
        throw new HttpError(403, 'csrf_failed', 'The request origin is not allowed.');
      }
    }
    await next();
  });
  app.use('/api/*', csrf({ origin: config.appOrigin }));

  app.get('/api/healthz', healthHandler({ sql: dependencies.sql, version: config.appVersion }));

  app.use(
    '/api/me',
    createSessionMiddleware({
      db: dependencies.db,
      cookieSecure: config.cookieSecure,
      trustProxy: config.trustProxy,
      limiter,
      allowGuestCreation: true,
    }),
  );
  app.get('/api/me', meHandler);

  const requiredSession = createSessionMiddleware({
    db: dependencies.db,
    cookieSecure: config.cookieSecure,
    trustProxy: config.trustProxy,
    limiter,
    allowGuestCreation: false,
  });
  const jsonBodyLimit = bodyLimit({
    maxSize: 16 * 1024,
    onError: () => {
      throw new HttpError(413, 'payload_too_large', 'The request body is too large.');
    },
  });
  app.use('/api/decisions', jsonBodyLimit, requiredSession);
  app.use('/api/decisions/*', jsonBodyLimit, requiredSession);
  app.route('/api/decisions', createDecisionRoutes({ db: dependencies.db }));
  app.use('/api/history', jsonBodyLimit, requiredSession);
  app.use('/api/history/*', jsonBodyLimit, requiredSession);
  app.route('/api/history', createHistoryRoutes({ db: dependencies.db }));
  app.use('/api/shares', jsonBodyLimit, requiredSession);
  app.use('/api/shares/*', jsonBodyLimit, requiredSession);
  app.route('/api/shares', createShareRoutes({ db: dependencies.db }));
  app.route('/api/public/shares', createPublicShareRoutes({ db: dependencies.db }));

  app.onError(createOnError(config.nodeEnv));
  app.notFound(notFound);
  return app;
}
