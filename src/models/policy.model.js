'use strict';

const mongoose = require('mongoose');

// Policy Info -- links every other collection together via ObjectId references.
const policySchema = new mongoose.Schema(
  {
    policy_number: { type: String, required: true, unique: true, trim: true },
    policy_start_date: { type: Date, default: null },
    policy_end_date: { type: Date, default: null },
    policy_mode: { type: String, default: '', trim: true },
    policy_type: { type: String, default: '', trim: true }, // Single | Package
    premium_amount: { type: Number, default: 0 },
    premium_amount_written: { type: Number, default: 0 },
    producer: { type: String, default: '', trim: true },
    csr: { type: String, default: '', trim: true },

    // References -- the core requirement of the assignment.
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LOB', index: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Carrier', index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', index: true },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Policy', policySchema);
