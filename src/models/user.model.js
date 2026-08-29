'use strict';

const mongoose = require('mongoose');

// The sheet's `firstname` column holds the full name ("Lura Lucca"); kept as-is.
const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true, trim: true, index: true },
    dob: { type: Date, default: null },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    zip: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true, index: true },
    gender: { type: String, default: '', trim: true },
    userType: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

// Dedupe key: email isn't unique (47 shared across people); firstname + dob is unique across all 1198 rows.
userSchema.index({ firstname: 1, dob: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
