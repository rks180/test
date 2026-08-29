'use strict';

const mongoose = require('mongoose');

// User's Account -> source columns: account_name, account_type.
const accountSchema = new mongoose.Schema(
  {
    account_name: { type: String, required: true, trim: true, index: true },
    account_type: { type: String, default: '', trim: true }, // Personal | Commercial
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// account_name alone isn't unique (5 names shared across users); dedupe on account_name + user_id.
accountSchema.index({ account_name: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('Account', accountSchema);
