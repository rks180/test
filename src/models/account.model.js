const mongoose = require('mongoose');

// User's Account -> CSV columns: account_name, account_type
const accountSchema = new mongoose.Schema(
  {
    account_name: { type: String, required: true, trim: true, index: true },
    account_type: { type: String, default: '', trim: true }, // Personal | Commercial
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// account_name akela unique nahi hai -- 5 account names do alag users ke saath aate hain
// (jaise "Lura Lucca & Owen Dodson" -> Lura Lucca aur High Low dono).
accountSchema.index({ account_name: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('Account', accountSchema);
