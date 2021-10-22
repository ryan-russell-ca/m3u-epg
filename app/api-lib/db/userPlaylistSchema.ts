import { ChannelGroupDocument } from '@/types/m3u';
import { UserPlaylistModel as UserPlaylistModelType } from '@/types/user';
import Mongoose, { Schema } from 'mongoose';
import { MongoCollectionNames, MongoCollectionModelNames } from './mongo';

const UserPlaylistSchema = new Schema(
  {
    date: { type: Date, default: () => Date.now() },
    user: {
      type: Schema.Types.ObjectId,
      ref: MongoCollectionModelNames.UserModel,
      required: true,
    },
    channels: [
      {
        details: {
          type: Schema.Types.ObjectId,
          ref: MongoCollectionModelNames.PlaylistChannelModel,
          required: true,
          unique: true,
        },
        order: Number,
      },
    ],
  },
  { collection: MongoCollectionNames.UserPlaylist }
);

export const UserPlaylistModel: Mongoose.Model<
  UserPlaylistModelType<ChannelGroupDocument>
> = Mongoose.models[MongoCollectionModelNames.UserPlaylistModel]
  ? Mongoose.model(MongoCollectionModelNames.UserPlaylistModel)
  : Mongoose.model<UserPlaylistModelType<ChannelGroupDocument>>(
      MongoCollectionModelNames.UserPlaylistModel,
      UserPlaylistSchema
    );

export default UserPlaylistModel;
