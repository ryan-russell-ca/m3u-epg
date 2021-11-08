namespace M3U {
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
    match: (options: MatchOptions) => XMLTV.CodeMatch[] | [number, string][];
  }

  export interface BaseModel {
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

  export interface ChannelInfoModel extends NameChannelInfo {
    group: string | null;
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
  }

  export interface ChannelInfoMapping {
    [url: string]: ChannelInfoModel;
  }

  export interface NameChannelInfo {
    region?: string;
    nameCode?: string;
    name?: string;
    definition?: string;
  }

  export type ChannelInfoDocument = Document<ObjectId, Record<string, unknown>, ChannelInfoModel> &
    ChannelInfoModel;

  export type BaseDocument = Document<ObjectId, Record<string, unknown>, BaseModel> & BaseModel;
}

