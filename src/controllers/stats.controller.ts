import { Request, Response, NextFunction } from 'express';
import { models } from '../models';

/** GET /api/stats -- document count per collection. */
export async function stats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const entries = await Promise.all(
      Object.values(models).map(async (Model) => [
        Model.collection.collectionName,
        await Model.estimatedDocumentCount(),
      ] as const)
    );
    res.json(Object.fromEntries(entries));
  } catch (err) {
    next(err);
  }
}

export default { stats };
