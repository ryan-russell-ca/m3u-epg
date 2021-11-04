namespace M3U {
  import { Document } from "mongoose";

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
    channels: ChannelInfoDocument[];
  }

  export interface ChannelInfoFilters {
    group?: string;
    tvgId?: string;
    name?: string;
    originalName?: string;
    url?: string;
    country?: string | null;
    definition?: string;
  }

  export interface ChannelInfoModel extends NameChannelInfo {
    group: string;
    tvgId: string;
    logo: string;
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

  export interface NameChannelInfoMatch {
    groups?: NameChannelInfo;
  }

  export type ChannelInfoDocument = Document<any, any, ChannelInfoModel> &
    ChannelInfoModel;

  export type BaseDocument = Document<any, any, BaseModel> & BaseModel;
}
