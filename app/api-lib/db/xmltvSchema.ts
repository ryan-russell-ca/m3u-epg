import Mongoose, { Schema } from 'mongoose';
import { MongoCollection } from './mongo';
import { ChannelModel, ProgrammeModel, BaseModel } from 'xmltv';

const XMLTVChannelSchema = new Schema(
  {
    '@_id': { type: String, unique: true },
    'display-name': String,
    icon: {
      '@_src': String,
    },
  },
  { collection: MongoCollection.XMLTVChannel }
);

export const XMLTVChannelModel = Mongoose.models['XMLTVChannelModel']
  ? Mongoose.model('XMLTVChannelModel')
  : Mongoose.model<ChannelModel>('XMLTVChannelModel', XMLTVChannelSchema);

const XMLTVProgrammeSchema = new Schema(
  {
    '@_start': String,
    '@_stop': String,
    '@_channel': String,
    title: { '#text': String, '@_lang': String },
    desc: { '#text': String, '@_lang': String },
    category: { '#text': String, '@_lang': String },
  },
  { collection: MongoCollection.XMLTVProgramme }
);

XMLTVProgrammeSchema.index(
  { '@_start': 1, '@_channel': 1 },
  {
    name: 'unique_schedule_item',
    unique: true,
  }
);

export const XMLTVProgrammeModel = Mongoose.models['XMLTVProgrammeModel']
  ? Mongoose.model('XMLTVProgrammeModel')
  : Mongoose.model<ProgrammeModel>('XMLTVProgrammeModel', XMLTVProgrammeSchema);

const XMLTVSchema = new Schema(
  {
    date: { type: Date, default: () => Date.now() },
    url: { type: String, required: true, unique: true },
    xmlTv: {
      channel: {
        type: [{ type: Schema.Types.ObjectId, ref: 'XMLTVChannelModel' }],
      },
      programme: {
        type: [{ type: Schema.Types.ObjectId, ref: 'XMLTVProgrammeModel' }],
      },
    },
  },
  { collection: MongoCollection.XMLTV }
);

export const XMLTVModel = Mongoose.models['XMLTVModel']
  ? Mongoose.model('XMLTVModel')
  : Mongoose.model<BaseModel>('XMLTVModel', XMLTVSchema);
