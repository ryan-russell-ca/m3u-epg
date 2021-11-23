import { CodeModel, CodeBaseModel } from '@/types/xmltv';
import Mongoose, { Schema } from 'mongoose';
import { MongoCollection } from './mongo';

const XMLTVCodeSchema = new Schema(
  {
    tvgId: { type: String, unique: true },
    displayName: String,
    logo: String,
    country: String,
    guides: [String],
  },
  { collection: MongoCollection.XMLTVCode }
);

export const XMLTVCodeModel: Mongoose.Model<CodeModel> = Mongoose.models[
  'XMLTVCodeModel'
]
  ? Mongoose.model('XMLTVCodeModel')
  : Mongoose.model<CodeModel>('XMLTVCodeModel', XMLTVCodeSchema);

const XMLTVCodesSchema = new Schema(
  {
    date: { type: Date, default: () => Date.now() },
    codes: {
      type: [{ type: Schema.Types.ObjectId, ref: 'XMLTVCodeModel' }],
    },
  },
  { collection: MongoCollection.XMLTVCodes }
);

export const XMLTVCodesModel: Mongoose.Model<CodeBaseModel> = Mongoose.models[
  'XMLTVCCodesModel'
]
  ? Mongoose.model('XMLTVCCodesModel')
  : Mongoose.model<CodeBaseModel>('XMLTVCCodesModel', XMLTVCodesSchema);

export default XMLTVCodesModel;
