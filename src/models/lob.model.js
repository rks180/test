const mongoose = require('mongoose');

// Policy Category (LOB = Line of Business) -> CSV column: category_name (19 unique)
const lobSchema = new mongoose.Schema(
  {
    category_name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LOB', lobSchema);
