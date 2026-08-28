const mongoose = require('mongoose');

// Policy Carrier -> CSV column: company_name (46 unique)
const carrierSchema = new mongoose.Schema(
  {
    company_name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Carrier', carrierSchema);
