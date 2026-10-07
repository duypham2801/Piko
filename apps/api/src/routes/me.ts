import type { MeResponseData } from '@wswd/domain';
import type { Context } from 'hono';

import type { AppEnv } from '../auth/session.middleware.js';

export function meHandler(c: Context<AppEnv>): Response {
  const user = c.var.user;
  const response: MeResponseData = {
    user: {
      id: user.id,
      kind: user.kind,
      createdAt: user.createdAt.toISOString(),
    },
  };
  return c.json(response, 200);
}
