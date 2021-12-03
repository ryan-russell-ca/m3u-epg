import Mongoose, { Schema } from 'mongoose';
import { ChannelModel, ProgrammeModel, BaseModel } from '@/types/xmltv';
import { MongoCollectionNames, MongoCollectionModelNames } from './mongo';

const XMLTVChannelSchema = new Schema(
  {
    '@_id': { type: String, unique: true },
    'display-name': String,
    icon: {
      '@_src': String,
    },
  },
  { collection: MongoCollectionNames.XMLTVChannel }
);

export const XMLTVChannelModel: Mongoose.Model<ChannelModel> = Mongoose.models[
  MongoCollectionModelNames.XMLTVChannelModel
]
  ? Mongoose.model(MongoCollectionModelNames.XMLTVChannelModel)
  : Mongoose.model<ChannelModel>(
      MongoCollectionModelNames.XMLTVChannelModel,
      XMLTVChannelSchema
    );

const XMLTVProgrammeSchema = new Schema(
  {
    '@_start': String,
    '@_stop': String,
    '@_channel': String,
    title: { '#text': String, '@_lang': String },
    desc: { '#text': String, '@_lang': String },
    category: { '#text': String, '@_lang': String },
  },
  { collection: MongoCollectionNames.XMLTVProgramme }
);

XMLTVProgrammeSchema.index(
  { '@_start': 1, '@_channel': 1 },
  {
    name: 'unique_schedule_item',
    unique: true,
  }
);

export const XMLTVProgrammeModel: Mongoose.Model<ProgrammeModel> = Mongoose
  .models[MongoCollectionModelNames.XMLTVProgrammeModel]
  ? Mongoose.model(MongoCollectionModelNames.XMLTVProgrammeModel)
  : Mongoose.model<ProgrammeModel>(
      MongoCollectionModelNames.XMLTVProgrammeModel,
      XMLTVProgrammeSchema
    );

const XMLTVSchema = new Schema(
  {
    date: { type: Date, default: () => Date.now() },
    url: { type: String, required: true, unique: true },
    xmlTv: {
      channel: {
        type: [
          {
            type: Schema.Types.ObjectId,
            ref: MongoCollectionModelNames.XMLTVChannelModel,
          },
        ],
      },
      programme: {
        type: [
          {
            type: Schema.Types.ObjectId,
            ref: MongoCollectionModelNames.XMLTVProgrammeModel,
          },
        ],
      },
    },
  },
  { collection: MongoCollectionNames.XMLTV }
);

export const XMLTVModel: Mongoose.Model<BaseModel> = Mongoose.models[
  MongoCollectionModelNames.XMLTVModel
]
  ? Mongoose.model(MongoCollectionModelNames.XMLTVModel)
  : Mongoose.model<BaseModel>(
      MongoCollectionModelNames.XMLTVModel,
      XMLTVSchema
    );
