import { Schema, model, Document, Types } from 'mongoose';

export interface IAgent extends Document<Types.ObjectId> {
  name: string;
}

// Source column: `agent` (only 3 unique agents in the whole sheet).
const agentSchema = new Schema<IAgent>(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export const Agent = model<IAgent>('Agent', agentSchema);
export default Agent;
