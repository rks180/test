import { Request, Response } from 'express';
import { Message } from '../models';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm (24h)

// Task 2.2 -- POST /api/messages { message, day: "YYYY-MM-DD", time: "HH:mm" }; saved as "scheduled", scheduler.ts delivers it at day+time (server local tz).
export async function create(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as { message?: unknown; day?: unknown; time?: unknown };
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const day = typeof body.day === 'string' ? body.day : '';
  const time = typeof body.time === 'string' ? body.time : '';

  const errors: string[] = [];
  if (!message) errors.push('"message" must be a non-empty string');
  if (!DAY_RE.test(day)) errors.push('"day" must be a date string in YYYY-MM-DD format');
  if (!TIME_RE.test(time)) errors.push('"time" must be a time string in HH:mm (24h) format');
  if (errors.length) {
    res.status(400).json({ error: 'Validation failed', details: errors });
    return;
  }

  const sendAt = new Date(`${day}T${time}:00`); // server local timezone
  if (Number.isNaN(sendAt.getTime())) {
    res.status(400).json({ error: `"${day} ${time}" is not a valid date/time` });
    return;
  }

  const doc = await Message.create({ message, day, time, sendAt });

  res.status(201).json({
    message: 'Message scheduled',
    data: doc,
    note:
      sendAt.getTime() <= Date.now()
        ? 'sendAt is in the past -- it will be delivered on the next poll'
        : undefined,
  });
}

/** GET /api/messages?status=scheduled|sent|failed&page=1&limit=20 */
export async function list(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const filter: Record<string, unknown> = {};
  if (req.query.status) filter.status = String(req.query.status);

  const [docs, total] = await Promise.all([
    Message.find(filter).sort({ sendAt: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Message.countDocuments(filter),
  ]);

  res.json({ page, limit, total, totalPages: Math.ceil(total / limit), messages: docs });
}

/** GET /api/messages/:id */
export async function getOne(req: Request, res: Response): Promise<void> {
  const doc = await Message.findById(req.params.id)
    .lean()
    .catch(() => null);
  if (!doc) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }
  res.json(doc);
}

export default { create, list, getOne };
