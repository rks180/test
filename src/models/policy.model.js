const mongoose = require('mongoose');

// Policy Info -- baaki sab collections ko ObjectId se jodta hai.
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

    // References -- assignment ka core requirement
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'LOB', index: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Carrier', index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', index: true },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Policy', policySchema);
