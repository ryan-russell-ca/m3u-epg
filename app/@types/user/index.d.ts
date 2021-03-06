import { Document, ObjectId } from 'mongoose';
import { ChannelInfoModel, ChannelOrderModel } from '../m3u';

export interface UserModel {
  id: string;
  emailVerified: boolean;
  profilePicture: string;
  email: string;
  name: string;
  password: string;
}

export interface UserPlaylistModel<P = string> {
  date: Date;
  user: UserModel;
  channels: ChannelOrderModel<P>[];
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
