import type { Request, Response } from 'express';
import * as collectionService from '../services/collection.service';

// GET /api/stats -- document count per collection.
export async function stats(_req: Request, res: Response): Promise<void> {
  res.json(await collectionService.collectionCounts());
}
