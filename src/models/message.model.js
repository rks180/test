'use strict';

const mongoose = require('mongoose');

// Task 2.2 -- stored on POST with status "scheduled"; scheduler.js flips it to "sent" when sendAt is due.
const messageSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    day: { type: String, required: true, trim: true }, // YYYY-MM-DD (raw input)
    time: { type: String, required: true, trim: true }, // HH:mm 24h (raw input)
    sendAt: { type: Date, required: true, index: true }, // day + time as an absolute instant

    status: {
      type: String,
      enum: ['scheduled', 'sent', 'failed'],
      default: 'scheduled',
      index: true,
    },
    sentAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ status: 1, sendAt: 1 }); // poller's hot query

module.exports = mongoose.model('Message', messageSchema);
