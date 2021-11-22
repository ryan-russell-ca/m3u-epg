import Mongoose, { Schema } from 'mongoose';

const XMLTVCodeSchema = new Schema(
  {
    tvgId: { type: String, unique: true },
    displayName: String,
    logo: String,
    country: String,
    guides: [String],
  },
  { collection: 'XMLTVCode' }
);

export const XMLTVCodeModel = Mongoose.model<CodeModel>(
  'XMLTVCodeModel',
  XMLTVCodeSchema
);

const XMLTVCodesSchema = new Schema(
  {
    date: { type: Date, default: Date.now() },
    codes: {
      type: [{ type: Schema.Types.ObjectId, ref: 'XMLTVCodeModel' }],
    },
  },
  { collection: 'XMLTVCodes' }
);

export const XMLTVCodesModel = Mongoose.model<CodeBaseModel>(
  'XMLTVCodesModel',
  XMLTVCodesSchema
);

export default XMLTVCodesModel;
