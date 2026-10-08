import * as z from 'zod/mini';

export const HealthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['ok', 'down']),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
