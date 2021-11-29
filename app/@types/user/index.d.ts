import { Document, ObjectId } from 'mongoose';
import { ChannelInfoModel } from '../m3u';

export interface UserModel {
  id: string;
  emailVerified: boolean;
  profilePicture: string;
  email: string;
  name: string;
  password: string;
}

export interface UserPlaylistModel {
  date: Date;
  user: UserModel;
  channels: ChannelInfoModel[];
}

export interface TokenModel {
  id: string;
  creatorId: string;
  type: string;
  expireAt: Date;
}

export type UserDocument = Document<
  ObjectId,
  Record<string, unknown>,
  UserModel
> &
  UserModel;

  export type UserPlaylistDocument = Document<
    ObjectId,
    Record<string, unknown>,
    UserPlaylistModel
  > &
    UserPlaylistModel;

export type TokenDocument = Document<
  ObjectId,
  Record<string, unknown>,
  TokenModel
> &
  TokenModel;
