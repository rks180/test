import { Schema, model, Document, Types } from 'mongoose';

export interface IPolicy extends Document<Types.ObjectId> {
  policy_number: string;
  policy_start_date: Date | null;
  policy_end_date: Date | null;
  policy_mode: string;
  policy_type: string;
  premium_amount: number;
  premium_amount_written: number;
  producer: string;
  csr: string;
  category_id?: Types.ObjectId;
  company_id?: Types.ObjectId;
  user_id: Types.ObjectId;
  agent_id?: Types.ObjectId;
  account_id?: Types.ObjectId;
}

// Policy Info -- links every other collection together via ObjectId references.
const policySchema = new Schema<IPolicy>(
  {
    policy_number: { type: String, required: true, unique: true, trim: true },
    policy_start_date: { type: Date, default: null },
    policy_end_date: { type: Date, default: null },
    policy_mode: { type: String, default: '', trim: true },
    policy_type: { type: String, default: '', trim: true }, // Single | Package
    premium_amount: { type: Number, default: 0 },
    premium_amount_written: { type: Number, default: 0 },
    producer: { type: String, default: '', trim: true },
    csr: { type: String, default: '', trim: true },

    // References -- the core requirement of the assignment.
    category_id: { type: Schema.Types.ObjectId, ref: 'LOB', index: true },
    company_id: { type: Schema.Types.ObjectId, ref: 'Carrier', index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agent_id: { type: Schema.Types.ObjectId, ref: 'Agent', index: true },
    account_id: { type: Schema.Types.ObjectId, ref: 'Account', index: true },
  },
  { timestamps: true }
);

export const Policy = model<IPolicy>('Policy', policySchema);
export default Policy;
