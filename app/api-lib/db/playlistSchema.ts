import { BaseModel, ChannelInfoModel } from '@/types/m3u';
import Mongoose, { Schema } from 'mongoose';
import { MongoCollection } from './mongo';

const COUNTRY_WHITELIST = JSON.parse(process.env.COUNTRY_WHITELIST as string);

const PlaylistChannelSchema = new Schema(
  {
    group: { type: String, required: true },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    country: {
      type: String,
      enum: COUNTRY_WHITELIST,
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

export const PlaylistChannelModel: Mongoose.Model<ChannelInfoModel> = Mongoose.models['PlaylistChannelModel']
  ? Mongoose.model('PlaylistChannelModel')
  : Mongoose.model<ChannelInfoModel>('PlaylistChannelModel', PlaylistChannelSchema);

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

const PlaylistModel: Mongoose.Model<BaseModel> = Mongoose.models['PlaylistModel']
  ? Mongoose.model('PlaylistModel')
  : Mongoose.model<BaseModel>('PlaylistModel', PlaylistSchema);

export default PlaylistModel;
