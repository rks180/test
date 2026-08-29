import { Schema, model, Document, Types } from 'mongoose';

export interface IAccount extends Document<Types.ObjectId> {
  account_name: string;
  account_type: string;
  user_id: Types.ObjectId;
}

// User's Account -> source columns: account_name, account_type.
const accountSchema = new Schema<IAccount>(
  {
    account_name: { type: String, required: true, trim: true, index: true },
    account_type: { type: String, default: '', trim: true }, // Personal | Commercial
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// account_name alone isn't unique (5 names shared across users); dedupe on account_name + user_id.
accountSchema.index({ account_name: 1, user_id: 1 }, { unique: true });

export const Account = model<IAccount>('Account', accountSchema);
export default Account;
