import { z } from 'zod';

// Shared pagination query -- coerces ?page / ?limit strings to bounded numbers.
export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof pagination>;
