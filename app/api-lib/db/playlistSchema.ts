import {
  BaseModel,
  ChannelInfoModel,
  ChannelGroupModel,
  ChannelCountryModel,
} from '@/types/m3u';
import Mongoose, { Schema } from 'mongoose';
import { MongoCollection } from './mongo';

const COUNTRY_WHITELIST = JSON.parse(process.env.COUNTRY_WHITELIST as string);

const PlaylistChannelGroupSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { collection: MongoCollection.PlaylistChannelGroup }
);

export const PlaylistChannelGroupModel: Mongoose.Model<ChannelGroupModel> =
  Mongoose.models['PlaylistChannelGroupModel']
    ? Mongoose.model('PlaylistChannelGroupModel')
    : Mongoose.model<ChannelGroupModel>(
        'PlaylistChannelGroupModel',
        PlaylistChannelGroupSchema
      );

const PlaylistChannelCountrySchema = new Schema(
  {
    name: { type: String, required: true },
    shortName: {
      type: String,
      enum: COUNTRY_WHITELIST,
      required: true,
      unique: true,
    },
  },
  { collection: MongoCollection.PlaylistChannelCountry }
);

export const PlaylistChannelCountryModel: Mongoose.Model<ChannelCountryModel> =
  Mongoose.models['PlaylistChannelCountryModel']
    ? Mongoose.model('PlaylistChannelCountryModel')
    : Mongoose.model<ChannelCountryModel>(
        'PlaylistChannelCountryModel',
        PlaylistChannelCountrySchema
      );

const PlaylistChannelSchema = new Schema(
  {
    group: {
      type: [{ type: Schema.Types.ObjectId, ref: 'PlaylistChannelGroupModel' }],
      required: true,
    },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    country: {
      type: [{ type: Schema.Types.ObjectId, ref: 'PlaylistChannelCountryModel' }],
      required: true,
    },
    url: {
      type: String,
      required: true,
      unique: true,
    },
    parsedName: String,
    parsedIds: [String],
    logo: String,
    tvgId: String,
    definition: String,
    confirmed: { type: Boolean, default: false },
    confidence: Number,
  },
  { collection: MongoCollection.PlaylistChannel }
);

export const PlaylistChannelModel: Mongoose.Model<ChannelInfoModel> = Mongoose
  .models['PlaylistChannelModel']
  ? Mongoose.model('PlaylistChannelModel')
  : Mongoose.model<ChannelInfoModel>(
      'PlaylistChannelModel',
      PlaylistChannelSchema
    );

const PlaylistSchema = new Schema(
  {
    date: { type: Date, default: () => Date.now() },
    channels: {
      type: [{ type: Schema.Types.ObjectId, ref: 'PlaylistChannelModel' }],
      required: true,
    },
  },
  { collection: MongoCollection.Playlist }
);

const PlaylistModel: Mongoose.Model<BaseModel> = Mongoose.models[
  'PlaylistModel'
]
  ? Mongoose.model('PlaylistModel')
  : Mongoose.model<BaseModel>('PlaylistModel', PlaylistSchema);

export default PlaylistModel;
