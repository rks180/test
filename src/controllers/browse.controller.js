'use strict';

const models = require('../models');

// URL me collection ka naam -> model. Whitelist hai taaki koi bhi collection na khul jaye.
const COLLECTIONS = {
  agents: 'Agent',
  carriers: 'Carrier',
  lobs: 'LOB',
  users: 'User',
  accounts: 'Account',
  policies: 'Policy',
};

/** GET /api/data/:collection?page=1&limit=20 -- raw documents dekhne ke liye. */
async function browse(req, res, next) {
  try {
    const key = String(req.params.collection || '').toLowerCase();
    const modelName = COLLECTIONS[key];
    if (!modelName) {
      return res.status(400).json({
        error: `Unknown collection "${key}"`,
        allowed: Object.keys(COLLECTIONS),
      });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const Model = models[modelName];

    let q = Model.find().skip((page - 1) * limit).limit(limit).lean();

    // References ko readable bana do -- warna sirf ObjectId dikhega
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

module.exports = { browse, COLLECTIONS };
