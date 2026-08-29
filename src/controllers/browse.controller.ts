import { Request, Response, NextFunction } from 'express';
import { models } from '../models';

// Collection name in the URL -> model. Whitelisted so arbitrary collections cannot be opened.
export const COLLECTIONS: Record<string, string> = {
  agents: 'Agent',
  carriers: 'Carrier',
  lobs: 'LOB',
  users: 'User',
  accounts: 'Account',
  policies: 'Policy',
};

/** GET /api/data/:collection?page=1&limit=20 -- inspect raw documents. */
export async function browse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const key = String(req.params.collection || '').toLowerCase();
    const modelName = COLLECTIONS[key];
    if (!modelName) {
      res.status(400).json({ error: `Unknown collection "${key}"`, allowed: Object.keys(COLLECTIONS) });
      return;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const Model = models[modelName];

    let q = Model.find().skip((page - 1) * limit).limit(limit).lean();

    // Resolve references to readable names -- otherwise only the ObjectId shows.
    if (key === 'policies') {
      q = q
        .populate('user_id', 'firstname')
        .populate('company_id', 'company_name')
        .populate('category_id', 'category_name')
        .populate('agent_id', 'name')
        .populate('account_id', 'account_name');
    } else if (key === 'accounts') {
      q = q.populate('user_id', 'firstname');
    }

    const [docs, total] = await Promise.all([q, Model.estimatedDocumentCount()]);

    res.json({
      collection: key,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      docs,
    });
  } catch (err) {
    next(err);
  }
}

export default { browse, COLLECTIONS };
