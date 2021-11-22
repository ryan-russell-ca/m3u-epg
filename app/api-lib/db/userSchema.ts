import Mongoose, { Schema } from 'mongoose';
import { MongoCollection } from './mongo';
import { UserModel as UserModelType, TokenModel as TokenModelType } from 'user';

const userSchema = new Schema(
  {
    emailVerified: { type: Boolean, required: true },
    profilePicture: { type: String, required: false },
    email: { type: String, required: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
  },
  { collection: MongoCollection.User }
);

export const UserModel = Mongoose.models['UserModel']
  ? Mongoose.model('UserModel')
  : Mongoose.model<UserModelType>('UserModel', userSchema);

const TokenSchema = new Schema(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: 'UserModel' },
    type: { type: String, required: true },
    expireAt: { type: Date, required: true },
  },
  { collection: MongoCollection.Token }
);

export const TokenModel = Mongoose.models['TokenModel']
  ? Mongoose.model('TokenModel')
  : Mongoose.model<TokenModelType>('TokenModel', TokenSchema);
