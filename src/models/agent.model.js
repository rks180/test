const mongoose = require('mongoose');

// CSV column: agent  (sirf 3 unique agents hain poore sheet me)
const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agent', agentSchema);
