import type { Request, Response } from 'express';
import * as collectionService from '../services/collection.service';
import type { Pagination } from '../validators/common.schema';
import type { CollectionName } from '../validators/collection.schema';

// GET /api/data/:collection -- inspect raw documents.
export async function browse(req: Request, res: Response): Promise<void> {
  const { collection } = req.valid!.params as { collection: CollectionName };
  const result = await collectionService.browseCollection(collection, req.valid!.query as Pagination);
  res.json({ collection, ...result });
}
