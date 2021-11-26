import { Document, ObjectId } from 'mongoose';

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
  logo?: string;
  country: string;
  guides: string[];
}

export interface CodeBaseModel {
  date?: Date;
  codes: CodeDocument[];
}

export type CodeDocument = Document<
  ObjectId,
  Record<string, unknown>,
  CodeModel
> &
  CodeModel;

export type CodeBaseDocument = Document<
  ObjectId,
  Record<string, unknown>,
  CodeBaseModel
> &
  CodeBaseModel;

export interface CodeMatch {
  score: number;
  match: string;
  code: CodeModel | null;
}

export interface ChannelModel {
  '@_id': string;
  'display-name': string;
  icon: {
    '@_src': string;
  };
}

export interface ProgrammeModel {
  '@_start': string;
  '@_stop': string;
  '@_channel': string;
  title: { '#text': string; '@_lang': string };
  desc?: { '#text': string; '@_lang': string };
  category?: { '#text': string; '@_lang': string };
}

export interface Base {
  date?: Date;
  url: string;
  xmlTv: {
    channel: ChannelModel[];
    programme: ProgrammeModel[];
  };
}

export type ChannelDocument = Document<
  ObjectId,
  Record<string, unknown>,
  ChannelModel
> &
  ChannelModel;

export type ProgrammeDocument = Document<
  ObjectId,
  Record<string, unknown>,
  ProgrammeModel
> &
  ProgrammeModel;

export interface BaseModel {
  date?: Date;
  xmlTv: {
    channel: ChannelDocument[];
    programme: ProgrammeDocument[];
  };
}

export type BaseDocument = Document<
  ObjectId,
  Record<string, unknown>,
  BaseModel
> &
  BaseModel;
