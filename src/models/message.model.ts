import { Schema, model, Document, Types } from 'mongoose';

export type MessageStatus = 'scheduled' | 'sent' | 'failed';

export interface IMessage extends Document<Types.ObjectId> {
  message: string;
  day: string;
  time: string;
  sendAt: Date;
  status: MessageStatus;
  sentAt: Date | null;
  error: string | null;
}

// Task 2.2 -- stored on POST with status "scheduled"; scheduler.ts flips it to "sent" when sendAt is due.
const messageSchema = new Schema<IMessage>(
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

export const Message = model<IMessage>('Message', messageSchema);
export default Message;
