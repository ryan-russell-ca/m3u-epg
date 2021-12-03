import { CodeModel, CodeBaseModel } from '@/types/xmltv';
import Mongoose, { Schema } from 'mongoose';
import { MongoCollectionNames, MongoCollectionModelNames } from './mongo';

const XMLTVCodeSchema = new Schema(
  {
    tvgId: { type: String, unique: true },
    displayName: String,
    logo: String,
    country: String,
    guides: [String],
  },
  { collection: MongoCollectionNames.XMLTVCode }
);

export const XMLTVCodeModel: Mongoose.Model<CodeModel> = Mongoose.models[
  MongoCollectionModelNames.XMLTVCodeModel
]
  ? Mongoose.model(MongoCollectionModelNames.XMLTVCodeModel)
  : Mongoose.model<CodeModel>(MongoCollectionModelNames.XMLTVCodeModel, XMLTVCodeSchema);

const XMLTVCodesSchema = new Schema(
  {
    date: { type: Date, default: () => Date.now() },
    codes: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: MongoCollectionModelNames.XMLTVCodeModel,
        },
      ],
    },
  },
  { collection: MongoCollectionNames.XMLTVCodes }
);

export const XMLTVCodesModel: Mongoose.Model<CodeBaseModel> = Mongoose.models[
  MongoCollectionModelNames.XMLTVCCodesModel
]
  ? Mongoose.model(MongoCollectionModelNames.XMLTVCCodesModel)
  : Mongoose.model<CodeBaseModel>(MongoCollectionModelNames.XMLTVCCodesModel, XMLTVCodesSchema);

export default XMLTVCodesModel;
