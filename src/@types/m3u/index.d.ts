namespace M3U {
  import { Document } from "mongoose";

  export interface Base {
    date: Date;
    m3u: Group[];
  }

  export interface Group extends NameGroup {
    group: string;
    id: string;
    logo: string;
    name: string;
    originalName: string;
    parsedName: string;
    url?: string;
    country: string | null;
    definition?: string;
    parsedIds: string[] | null;
  };

  export interface CustomMapping {
    originalName: string;
    name: string | null;
    id: string | null;
    logo: string | null;
    country: string | null;
    confirmed: boolean;
  };

  export interface CustomMappings {
    [url: string]: CustomMapping;
  };

  export interface NameGroup {
    region?: string;
    nameCode?: string;
    name?: string;
    definition?: string;
  };

  export interface NameGroupMatch {
    groups?: NameGroup;
  };

  export type GroupDocument = Document<any, any, M3U.Group> & M3U.Group;

  export type BaseModel = {
    date: Date;
    m3u: GroupDocument[];
  };

  export type BaseDocument = Document<any, any, BaseModel> & BaseModel;
}
