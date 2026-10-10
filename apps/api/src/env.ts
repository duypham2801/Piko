import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

const devExtraOrigins = z
  .preprocess(
    (value) =>
      typeof value === 'string'
        ? value
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
        : [],
    z.array(z.string()),
  )
  .superRefine((origins, context) => {
    for (const origin of origins) {
      let url: URL;
      try {
        url = new URL(origin);
      } catch {
        context.addIssue({
          code: 'custom',
          message: `Invalid DEV_EXTRA_ORIGINS entry: ${origin}`,
        });
        continue;
      }

      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
        context.addIssue({
          code: 'custom',
          message: `Invalid DEV_EXTRA_ORIGINS entry: ${origin}`,
        });
      }
    }
  });

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(8787),
    DATABASE_URL: z.string().min(1),
    APP_ORIGIN: z.url(),
    DEV_EXTRA_ORIGINS: devExtraOrigins,
    COOKIE_SECURE: booleanFromEnv,
    TRUST_PROXY: booleanFromEnv,
    APP_VERSION: z.string().min(1).default('dev'),
    GUEST_RATE_LIMIT_PER_HOUR: z.coerce.number().int().min(0).default(20),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== 'development' && env.DEV_EXTRA_ORIGINS.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['DEV_EXTRA_ORIGINS'],
        message: 'DEV_EXTRA_ORIGINS is only allowed in development.',
      });
    }
    if (
      env.NODE_ENV === 'production' &&
      env.APP_ORIGIN.startsWith('https://') &&
      !env.COOKIE_SECURE
    ) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true when APP_ORIGIN uses https:// in production.',
      });
    }
  });

export type ApiEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}
