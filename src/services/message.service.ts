import { Message } from '../models';
import { NotFoundError } from '../lib/http-error';
import type { CreateBody, ListQuery } from '../validators/message.schema';

// Task 2.2 -- store the message; scheduler.ts delivers it at sendAt.
export async function scheduleMessage(input: CreateBody) {
  const sendAt = new Date(`${input.day}T${input.time}:00`); // server local timezone
  const doc = await Message.create({
    message: input.message,
    day: input.day,
    time: input.time,
    sendAt,
  });
  return { doc, past: sendAt.getTime() <= Date.now() };
}

export async function listMessages(q: ListQuery) {
  const filter = q.status ? { status: q.status } : {};
  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ sendAt: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Message.countDocuments(filter),
  ]);
  return {
    messages,
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
  };
}

export async function getMessage(id: string) {
  const doc = await Message.findById(id).lean();
  if (!doc) throw new NotFoundError('Message not found');
  return doc;
}
