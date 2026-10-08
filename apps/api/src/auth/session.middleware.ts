import { getConnInfo } from '@hono/node-server/conninfo';
import { getCookie, setCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';

import type { Database } from '../db/client.js';
import { HttpError } from '../lib/errors.js';
import {
  createGuestSession,
  resolveSession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  touchSession,
  type SessionRecord,
  type SessionUser,
} from './session.service.js';
import { FixedWindowRateLimiter } from './rate-limit.js';

export type AppEnv = {
  Variables: {
    user: SessionUser;
    session: SessionRecord;
  };
};

export interface SessionMiddlewareOptions {
  db: Database;
  cookieSecure: boolean;
  trustProxy: boolean;
  limiter: FixedWindowRateLimiter;
  allowGuestCreation: boolean;
}

function clientIp(c: Parameters<MiddlewareHandler<AppEnv>>[0], trustProxy: boolean): string {
  if (trustProxy) {
    const forwardedFor = c.req.header('X-Forwarded-For');
    const firstIp = forwardedFor?.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function writeSessionCookie(
  c: Parameters<MiddlewareHandler<AppEnv>>[0],
  token: string,
  secure: boolean,
): void {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function createSessionMiddleware(
  options: SessionMiddlewareOptions,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE_NAME);
    const resolved = token ? await resolveSession(options.db, token) : null;

    if (resolved && token) {
      const wasTouched = await touchSession(options.db, resolved.session, new Date());
      c.set('user', resolved.user);
      c.set('session', resolved.session);
      if (wasTouched) writeSessionCookie(c, token, options.cookieSecure);
      await next();
      return;
    }

    if (!options.allowGuestCreation) {
      throw new HttpError(401, 'session_required', 'A session is required.');
    }

    if (!options.limiter.consume(clientIp(c, options.trustProxy))) {
      throw new HttpError(429, 'rate_limited', 'Too many guest sessions created. Try again later.');
    }

    const created = await createGuestSession(options.db);
    c.set('user', created.user);
    c.set('session', created.session);
    writeSessionCookie(c, created.token, options.cookieSecure);
    await next();
  };
}
