import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { createDb } from './db/client.js';
import { loadEnv } from './env.js';

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
      additionalAppOrigin: env.DEV_LAN_ORIGIN,
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

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; shutting down.`);

    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();

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
