import * as z from 'zod/mini';

export const MeResponse = z.object({
  user: z.object({
    id: z.uuid(),
    kind: z.enum(['guest', 'registered']),
    createdAt: z.iso.datetime(),
  }),
});

export type MeResponse = z.infer<typeof MeResponse>;
