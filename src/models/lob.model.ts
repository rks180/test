import { Schema, model, Document, Types } from 'mongoose';

export interface ILOB extends Document<Types.ObjectId> {
  category_name: string;
}

// Policy Category (LOB = Line of Business) -> source column: `category_name` (19 unique).
const lobSchema = new Schema<ILOB>(
  {
    category_name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export const LOB = model<ILOB>('LOB', lobSchema);
export default LOB;
