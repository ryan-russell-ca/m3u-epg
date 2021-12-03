import {
  BaseModel,
  ChannelInfoModel,
  ChannelGroupModel,
  ChannelCountryModel,
} from '@/types/m3u';
import Mongoose, { Schema } from 'mongoose';
import { MongoCollectionNames, MongoCollectionModelNames } from './mongo';

const COUNTRY_WHITELIST = JSON.parse(process.env.COUNTRY_WHITELIST as string);

const PlaylistChannelGroupSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { collection: MongoCollectionNames.PlaylistChannelGroup }
);

export const PlaylistChannelGroupModel: Mongoose.Model<ChannelGroupModel> =
  Mongoose.models[MongoCollectionModelNames.PlaylistChannelGroupModel]
    ? Mongoose.model(MongoCollectionModelNames.PlaylistChannelGroupModel)
    : Mongoose.model<ChannelGroupModel>(
        MongoCollectionModelNames.PlaylistChannelGroupModel,
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
  { collection: MongoCollectionNames.PlaylistChannelCountry }
);

export const PlaylistChannelCountryModel: Mongoose.Model<ChannelCountryModel> =
  Mongoose.models[MongoCollectionModelNames.PlaylistChannelCountryModel]
    ? Mongoose.model(MongoCollectionModelNames.PlaylistChannelCountryModel)
    : Mongoose.model<ChannelCountryModel>(
        MongoCollectionModelNames.PlaylistChannelCountryModel,
        PlaylistChannelCountrySchema
      );

const PlaylistChannelSchema = new Schema(
  {
    group: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: MongoCollectionModelNames.PlaylistChannelGroupModel,
        },
      ],
      required: true,
    },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    country: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: MongoCollectionModelNames.PlaylistChannelCountryModel,
        },
      ],
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
  { collection: MongoCollectionNames.PlaylistChannel }
);

export const PlaylistChannelModel: Mongoose.Model<ChannelInfoModel> = Mongoose
  .models[MongoCollectionModelNames.PlaylistChannelModel]
  ? Mongoose.model(MongoCollectionModelNames.PlaylistChannelModel)
  : Mongoose.model<ChannelInfoModel>(
      MongoCollectionModelNames.PlaylistChannelModel,
      PlaylistChannelSchema
    );

const PlaylistSchema = new Schema(
  {
    date: { type: Date, default: () => Date.now() },
    channels: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: MongoCollectionModelNames.PlaylistChannelModel,
        },
      ],
      required: true,
    },
  },
  { collection: MongoCollectionNames.Playlist }
);

export const PlaylistModel: Mongoose.Model<BaseModel> = Mongoose.models[
  MongoCollectionModelNames.PlaylistModel
]
  ? Mongoose.model(MongoCollectionModelNames.PlaylistModel)
  : Mongoose.model<BaseModel>(
      MongoCollectionModelNames.PlaylistModel,
      PlaylistSchema
    );
