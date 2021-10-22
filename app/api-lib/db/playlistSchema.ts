import {
  PlaylistModel as PlaylistModelType,
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
    slug: { type: String, required: true, unique: true },
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
      type: Schema.Types.ObjectId,
      ref: MongoCollectionModelNames.PlaylistChannelGroupModel,
      required: true,
    },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    country: {
      type: Schema.Types.ObjectId,
      ref: MongoCollectionModelNames.PlaylistChannelCountryModel,
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

export const PlaylistChannelModel: Mongoose.Model<ChannelInfoModel<ChannelGroupModel>> = Mongoose
  .models[MongoCollectionModelNames.PlaylistChannelModel]
  ? Mongoose.model(MongoCollectionModelNames.PlaylistChannelModel)
  : Mongoose.model<ChannelInfoModel<ChannelGroupModel>>(
      MongoCollectionModelNames.PlaylistChannelModel,
      PlaylistChannelSchema
    );

const PlaylistSchema = new Schema(
  {
    date: { type: Date, default: () => Date.now() },
    url: { type: String, required: true },
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

export const PlaylistModel: Mongoose.Model<PlaylistModelType> = Mongoose.models[
  MongoCollectionModelNames.PlaylistModel
]
  ? Mongoose.model(MongoCollectionModelNames.PlaylistModel)
  : Mongoose.model<PlaylistModelType>(
      MongoCollectionModelNames.PlaylistModel,
      PlaylistSchema
    );
