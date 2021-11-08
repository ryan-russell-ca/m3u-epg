import Mongoose, { Schema } from 'mongoose';
import { MongoCollection } from './Mongo';

const xmltvCodeSchema = new Schema(
  {
    tvgId: { type: String, unique: true },
    displayName: String,
    logo: String,
    country: String,
    guides: [String],
  },
  { collection: MongoCollection.XMLTvCode }
);

export const xmltvCodeModel = Mongoose.model<XMLTV.CodeModel>(
  'xmltvCodeModel',
  xmltvCodeSchema
);

const xmltvCodesSchema = new Schema(
  {
    date: { type: Date, default: () => Date.now() },
    codes: {
      type: [{ type: Schema.Types.ObjectId, ref: 'xmltvCodeModel' }],
    },
  },
  { collection: MongoCollection.XMLTvCodes }
);

export const xmltvCodesModel = Mongoose.model<XMLTV.CodeBaseModel>(
  'xmltvCodesModel',
  xmltvCodesSchema
);

export default xmltvCodesModel;
