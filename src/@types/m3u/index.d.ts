namespace M3U {
  import { Document } from "mongoose";

  export interface Base {
    date?: Date;
    m3u: ChannelInfo[];
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

  export interface ChannelInfo extends NameChannelInfo {
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
  }

  export interface CustomMapping {
    originalName: string;
    name: string | null;
    tvgId: string | null;
    logo: string | null;
    country: string | null;
    confirmed: boolean;
  }

  export interface CustomMappings {
    [url: string]: CustomMapping;
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

  export type ChannelInfoDocument = Document<any, any, ChannelInfo> &
    ChannelInfo;

  export type BaseModel = {
    date?: Date;
    m3u: ChannelInfoDocument[];
  };

  export type BaseDocument = Document<any, any, BaseModel> & BaseModel;
}