import { z } from 'zod';

// POST /api/cpu/stress -- demo load generator, capped at 30s.
export const stressBody = z.object({
  seconds: z.coerce.number().int().min(1).max(30).default(10),
});

export type StressBody = z.infer<typeof stressBody>;
