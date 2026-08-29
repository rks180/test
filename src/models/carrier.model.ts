import { Schema, model, Document, Types } from 'mongoose';

export interface ICarrier extends Document<Types.ObjectId> {
  company_name: string;
}

// Policy Carrier -> source column: `company_name` (46 unique).
const carrierSchema = new Schema<ICarrier>(
  {
    company_name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export const Carrier = model<ICarrier>('Carrier', carrierSchema);
export default Carrier;
