import { z } from 'zod';
import { pagination } from './common.schema';

export const COLLECTIONS = ['agents', 'carriers', 'lobs', 'users', 'accounts', 'policies'] as const;

export const collectionParam = z.object({
  collection: z.enum(COLLECTIONS),
});

export const browseQuery = pagination;

export type CollectionName = (typeof COLLECTIONS)[number];
