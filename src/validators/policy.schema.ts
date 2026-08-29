import { z } from 'zod';
import { pagination } from './common.schema';

// GET /api/policies/search
export const searchQuery = pagination.extend({
  username: z.string().trim().min(1, 'username is required'),
  exact: z.coerce.boolean().default(false),
});

// GET /api/policies/aggregate
export const aggregateQuery = pagination.extend({
  username: z.string().trim().min(1).optional(),
});

export type SearchQuery = z.infer<typeof searchQuery>;
export type AggregateQuery = z.infer<typeof aggregateQuery>;
