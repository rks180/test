import type { Request, Response } from 'express';
import * as messageService from '../services/message.service';
import type { CreateBody, ListQuery } from '../validators/message.schema';

// Task 2.2 -- POST /api/messages
export async function create(req: Request, res: Response): Promise<void> {
  const { doc, past } = await messageService.scheduleMessage(req.valid!.body as CreateBody);
  res.status(201).json({
    message: 'Message scheduled',
    data: doc,
    note: past ? 'sendAt is in the past -- it will be delivered on the next poll' : undefined,
  });
}

// GET /api/messages
export async function list(req: Request, res: Response): Promise<void> {
  res.json(await messageService.listMessages(req.valid!.query as ListQuery));
}

// GET /api/messages/:id
export async function getOne(req: Request, res: Response): Promise<void> {
  const { id } = req.valid!.params as { id: string };
  res.json(await messageService.getMessage(id));
}
