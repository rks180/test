import { z } from 'zod';
import { pagination } from './common.schema';

// POST /api/messages
export const createBody = z
  .object({
    message: z.string().trim().min(1),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'day must be YYYY-MM-DD'),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'time must be HH:mm (24h)'),
  })
  .refine((v) => !Number.isNaN(new Date(`${v.day}T${v.time}:00`).getTime()), {
    message: 'day + time is not a valid date',
    path: ['day'],
  });

// GET /api/messages
export const listQuery = pagination.extend({
  status: z.enum(['scheduled', 'sent', 'failed']).optional(),
});

// GET /api/messages/:id
export const idParam = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'invalid id'),
});

export type CreateBody = z.infer<typeof createBody>;
export type ListQuery = z.infer<typeof listQuery>;
