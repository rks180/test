'use strict';

const mongoose = require('mongoose');

// Source column: `agent` (only 3 unique agents in the whole sheet).
const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agent', agentSchema);
