'use strict';

const models = require('../models');

/** GET /api/stats -- document count per collection. */
async function stats(req, res, next) {
  try {
    const entries = await Promise.all(
      Object.entries(models).map(async ([name, Model]) => [
        Model.collection.collectionName,
        await Model.estimatedDocumentCount(),
      ])
    );
    res.json(Object.fromEntries(entries));
  } catch (err) {
    next(err);
  }
}

module.exports = { stats };
