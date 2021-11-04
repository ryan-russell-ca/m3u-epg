namespace XMLTV {
  import { Document } from "mongoose";
  
  export interface CodeRaw {
    tvg_id: string;
    display_name: string;
    logo: string;
    country: string;
    guides: string[];
  }

  export interface CodeModel {
    tvgId: string;
    displayName: string;
    logo: string;
    country: string;
    guides: string[];
  }

  export interface CodeBaseModel {
    date?: Date;
    codes: CodeDocument[];
  }

  export type CodeDocument = Document<any, any, CodeModel> & CodeModel;

  export type CodeBaseDocument = Document<any, any, CodeBaseModel> & CodeBaseModel;

  export interface CodeBaseSorted {
    [key: string]: CodeModel;
  }

  export interface CodeMatch {
    score: number;
    match: string;
    code: CodeModel | null;
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
    date?: Date;
    url: string;
    xmlTv: {
      channel: ChannelModel[];
      programme: ProgrammeModel[];
    };
  }

  export type ChannelDocument = Document<any, any, ChannelModel> & ChannelModel;

  export type ProgrammeDocument = Document<any, any, ProgrammeModel> &
    ProgrammeModel;

  export interface BaseModel {
    date?: Date;
    xmlTv: {
      channel: ChannelDocument[];
      programme: ProgrammeDocument[];
    };
  }

  export type BaseDocument = Document<any, any, BaseModel> & BaseModel;
}
