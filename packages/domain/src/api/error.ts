import * as z from 'zod/mini';

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof ApiError>;
