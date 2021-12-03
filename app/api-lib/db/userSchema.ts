import Mongoose, { Schema } from 'mongoose';
import { UserModel as UserModelType, TokenModel as TokenModelType } from '@/types/user';
import { MongoCollectionNames, MongoCollectionModelNames } from './mongo';

const userSchema = new Schema(
  {
    emailVerified: { type: Boolean, required: true },
    profilePicture: { type: String, required: false },
    email: { type: String, required: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
  },
  { collection: MongoCollectionNames.User }
);

export const UserModel: Mongoose.Model<UserModelType> = Mongoose.models[MongoCollectionModelNames.UserModel]
  ? Mongoose.model(MongoCollectionModelNames.UserModel)
  : Mongoose.model<UserModelType>(MongoCollectionModelNames.UserModel, userSchema);

const TokenSchema = new Schema(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: MongoCollectionModelNames.UserModel,
    },
    type: { type: String, required: true },
    expireAt: { type: Date, required: true },
  },
  { collection: MongoCollectionNames.Token }
);

export const TokenModel: Mongoose.Model<TokenModelType> = Mongoose.models[MongoCollectionModelNames.TokenModel]
  ? Mongoose.model(MongoCollectionModelNames.TokenModel)
  : Mongoose.model<TokenModelType>(MongoCollectionModelNames.TokenModel, TokenSchema);
