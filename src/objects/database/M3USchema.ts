import Mongoose, { Schema } from 'mongoose';
import { MongoCollection } from './Mongo';

const COUNTRY_WHITELIST = JSON.parse(process.env.COUNTRY_WHITELIST as string);

const M3UChannelSchema = new Schema(
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

export const M3UChannelModel = Mongoose.model<M3U.ChannelInfoModel>(
  'M3UChannelModel',
  M3UChannelSchema
);

const M3USchema = new Schema(
  {
    date: { type: Date, default: () => Date.now() },
    channels: {
      type: [{ type: Schema.Types.ObjectId, ref: 'M3UChannelModel' }],
      required: true,
    },
  },
  { collection: MongoCollection.Playlist }
);

const M3UModel = Mongoose.model<M3U.BaseModel>('M3UModel', M3USchema);

export default M3UModel;
