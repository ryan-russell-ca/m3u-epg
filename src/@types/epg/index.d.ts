namespace EPG {
  import { Document } from "mongoose";
  
  export interface Code {
    tvg_id: string;
    display_name: string;
    logo: string;
    country: string;
    guides: string[];
  }

  export interface CodeBase {
    date: number;
    codes: Code[];
  }

  export interface CodeBaseSorted {
    [key: string]: Code;
  }

  export interface CodeMatch {
    score: number;
    match: string;
    code: Code | null;
  }

  export interface ChannelModel {
    "@_id": string;
    "display-name": string;
    icon: {
      "@_src": string;
    };
  }

  export interface ProgrammeModel {
    "@_start": string;
    "@_stop": string;
    "@_channel": string;
    title: { "#text": string; "@_lang": string };
  }

  export interface Base {
    date: Date;
    url: string;
    xmlTv: {
      channel: ChannelModel[];
      programme: ProgrammeModel[];
    };
  }

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

  export type ChannelDocument = Document<any, any, ChannelModel> & ChannelModel;

  export type ProgrammeDocument = Document<any, any, ProgrammeModel> &
    ProgrammeModel;

  export interface BaseModel {
    date: number;
    xmlTv: {
      channel: ChannelDocument[];
      programme: ProgrammeDocument[];
    };
  }

  export type BaseDocument = Document<any, any, BaseModel> & BaseModel;
}
