import { models } from '../models';
import type { Pagination } from '../validators/common.schema';
import type { CollectionName } from '../validators/collection.schema';

const MODEL_BY_COLLECTION: Record<CollectionName, string> = {
  agents: 'Agent',
  carriers: 'Carrier',
  lobs: 'LOB',
  users: 'User',
  accounts: 'Account',
  policies: 'Policy',
};

export async function browseCollection(collection: CollectionName, q: Pagination) {
  const Model = models[MODEL_BY_COLLECTION[collection]];

  let query = Model.find()
    .skip((q.page - 1) * q.limit)
    .limit(q.limit)
    .lean();

  if (collection === 'policies') {
    query = query
      .populate('user_id', 'firstname')
      .populate('company_id', 'company_name')
      .populate('category_id', 'category_name')
      .populate('agent_id', 'name')
      .populate('account_id', 'account_name');
  } else if (collection === 'accounts') {
    query = query.populate('user_id', 'firstname');
  }

  const [docs, total] = await Promise.all([query, Model.countDocuments()]);
  return { docs, meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) } };
}

export async function collectionCounts() {
  const entries = await Promise.all(
    Object.values(models).map(
      async (Model) => [Model.collection.collectionName, await Model.countDocuments()] as const
    )
  );
  return Object.fromEntries(entries);
}
