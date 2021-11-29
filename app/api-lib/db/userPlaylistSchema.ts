import { UserPlaylistModel as UserPlaylistModelType } from '@/types/user';
import Mongoose, { Schema } from 'mongoose';
import { MongoCollection } from './mongo';
import { PlaylistChannelModel } from './playlistSchema';
import { UserModel } from './userSchema';

const UserPlaylistSchema = new Schema(
  {
    date: { type: Date, default: () => Date.now() },
    user: {
      type: { type: Schema.Types.ObjectId, ref: UserModel },
      required: true,
    },
    channels: {
      type: [{ type: Schema.Types.ObjectId, ref: PlaylistChannelModel }],
      required: true,
      unique: true,
    },
  },
  { collection: MongoCollection.UserPlaylist }
);

export const UserPlaylistModel: Mongoose.Model<UserPlaylistModelType> = Mongoose
  .models['UserPlaylistModel']
  ? Mongoose.model('UserPlaylistModel')
  : Mongoose.model<UserPlaylistModelType>('UserPlaylistModel', UserPlaylistSchema);

export default UserPlaylistModel;
