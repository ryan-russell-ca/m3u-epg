import { Document, ObjectId } from 'mongoose';

export interface UserModel {
  id: string;
  emailVerified: boolean;
  profilePicture: string;
  email: string;
  name: string;
  password: string;
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

export type TokenDocument = Document<
  ObjectId,
  Record<string, unknown>,
  TokenModel
> &
  TokenModel;
