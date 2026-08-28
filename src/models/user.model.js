const mongoose = require('mongoose');

// CSV me `firstname` actually poora naam hota hai ("Lura Lucca"), isliye naam wahi rakha hai.
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

// Dedupe key: email par UNIQUE nahi laga sakte -- sheet me 47 emails do alag logon ke
// paas hain (alag naam/dob/phone). firstname + dob milkar 1198/1198 unique hain.
userSchema.index({ firstname: 1, dob: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
