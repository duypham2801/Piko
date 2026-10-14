import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { createDb } from './db/client.js';
import { loadEnv } from './env.js';
import { PRUNE_INTERVAL_MS, pruneExpiredData } from './services/maintenance.service.js';

async function main(): Promise<void> {
  let env;
  try {
    env = loadEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Invalid environment configuration.');
    process.exitCode = 1;
    return;
  }

  const { db, sql } = createDb(env.DATABASE_URL);
  const app = createApp(
    {
      nodeEnv: env.NODE_ENV,
      appOrigin: env.APP_ORIGIN,
      additionalAppOrigins: env.DEV_EXTRA_ORIGINS,
      cookieSecure: env.COOKIE_SECURE,
      trustProxy: env.TRUST_PROXY,
      appVersion: env.APP_VERSION,
      guestRateLimitPerHour: env.GUEST_RATE_LIMIT_PER_HOUR,
    },
    { db, sql },
  );

  const server = serve({
    fetch: app.fetch,
    hostname: '0.0.0.0',
    port: env.API_PORT,
  });

  console.log(`API listening on http://0.0.0.0:${env.API_PORT}`);

  let pruneTimer: ReturnType<typeof setInterval> | undefined;
  if (env.NODE_ENV !== 'test') {
    const runPrune = async (): Promise<void> => {
      try {
        const result = await pruneExpiredData(db);
        if (result.sessions > 0 || result.guests > 0 || result.shares > 0) {
          console.log(
            `Pruned expired data: sessions=${result.sessions} guests=${result.guests} shares=${result.shares}`,
          );
        }
      } catch (error) {
        console.error(
          'Data pruning failed:',
          error instanceof Error ? error.message : 'Unknown pruning error.',
        );
      }
    };

    void runPrune();
    pruneTimer = setInterval(() => void runPrune(), PRUNE_INTERVAL_MS);
    pruneTimer.unref();
  }

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; shutting down.`);

    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    if (pruneTimer) clearInterval(pruneTimer);

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await sql.end({ timeout: 5 });
    clearTimeout(forceExit);
    process.exitCode = 0;
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  console.error('API failed to start:', error);
  process.exitCode = 1;
});
