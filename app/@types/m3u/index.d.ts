import { Document, ObjectId } from 'mongoose';

export interface MatchOptions {
  name?: string | string[];
  id?: string | string[];
  formatted?: boolean;
  listAll?: boolean;
}

export interface MatchOptionsSingle {
  id?: string;
  name?: string;
}

export interface Matcher {
  match: (options: MatchOptions) => CodeMatch[] | [number, string][];
}

export interface PlaylistModel {
  date?: Date;
  channels: (ChannelInfoModel | ChannelInfoDocument)[];
}

export interface ChannelInfoFilters {
  group?: string;
  tvgId?: string;
  name?: string;
  originalName?: string;
  url?: string;
  country?: string;
  definition?: string;
}

export interface ChannelInfoModel<P = string> extends NameChannelInfo {
  id?: string;
  group: P | null;
  tvgId: string | null;
  logo: string | null;
  name: string;
  originalName: string;
  parsedName: string;
  url: string;
  country: string | null;
  definition?: string;
  parsedIds: string[] | null;
  confirmed: boolean;
  confidence?: number;
}

export interface ChannelOrderModel<P = string> {
  details: ChannelInfoModel<P>;
  order?: number;
}

export interface ChannelInfoMapping {
  [url: string]: ChannelInfoModel;
}

export interface ChannelGroupModel {
  name: string;
  slug: string;
}

export interface ChannelCountryModel {
  name: string;
  shortName: string;
}

export interface NameChannelInfo {
  region?: string;
  nameCode?: string;
  name?: string;
  definition?: string;
}

export type ChannelGroupDocument = Document<
  ObjectId,
  Record<string, unknown>,
  ChannelGroupModel
> &
  ChannelGroupModel;

export type ChannelCountryDocument = Document<
  ObjectId,
  Record<string, unknown>,
  ChannelCountryModel
> &
  ChannelCountryModel;

export type ChannelInfoDocument = Document<
  ObjectId,
  Record<string, unknown>,
  ChannelInfoModel
> &
  ChannelInfoModel;

export type BaseDocument = Document<
  ObjectId,
  Record<string, unknown>,
  PlaylistModel
> &
  PlaylistModel;
