import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document<Types.ObjectId> {
  firstname: string;
  dob: Date | null;
  address: string;
  city: string;
  phone: string;
  state: string;
  zip: string;
  email: string;
  gender: string;
  userType: string;
}

// The sheet's `firstname` column holds the full name ("Lura Lucca"); kept as-is.
const userSchema = new Schema<IUser>(
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

// Dedupe key: email isn't unique (47 shared across people); firstname + dob is unique across all 1198 rows.
userSchema.index({ firstname: 1, dob: 1 }, { unique: true });

export const User = model<IUser>('User', userSchema);
export default User;
