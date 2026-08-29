'use strict';

const { Message } = require('../models');

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm (24h)

/**
 * Task 2.2 -- POST /api/messages  body: { message, day: "YYYY-MM-DD", time: "HH:mm" }
 * Saved now as "scheduled"; scheduler.js delivers it at day+time (server local tz).
 */
async function create(req, res) {
  const { message, day, time } = req.body || {};

  const errors = [];
  if (typeof message !== 'string' || !message.trim()) errors.push('"message" must be a non-empty string');
  if (typeof day !== 'string' || !DAY_RE.test(day)) errors.push('"day" must be a date string in YYYY-MM-DD format');
  if (typeof time !== 'string' || !TIME_RE.test(time)) errors.push('"time" must be a time string in HH:mm (24h) format');
  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

  const sendAt = new Date(`${day}T${time}:00`); // server local timezone
  if (Number.isNaN(sendAt.getTime())) {
    return res.status(400).json({ error: `"${day} ${time}" is not a valid date/time` });
  }

  const doc = await Message.create({ message: message.trim(), day, time, sendAt });

  res.status(201).json({
    message: 'Message scheduled',
    data: doc,
    note: sendAt.getTime() <= Date.now() ? 'sendAt is in the past -- it will be delivered on the next poll' : undefined,
  });
}

/** GET /api/messages?status=scheduled|sent|failed&page=1&limit=20 */
async function list(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);

  const [docs, total] = await Promise.all([
    Message.find(filter).sort({ sendAt: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Message.countDocuments(filter),
  ]);

  res.json({ page, limit, total, totalPages: Math.ceil(total / limit), messages: docs });
}

/** GET /api/messages/:id */
async function getOne(req, res) {
  const doc = await Message.findById(req.params.id).lean().catch(() => null);
  if (!doc) return res.status(404).json({ error: 'Message not found' });
  res.json(doc);
}

module.exports = { create, list, getOne };
