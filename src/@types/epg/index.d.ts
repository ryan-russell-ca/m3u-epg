declare module "EPG" {
  export type Code = {
    tvg_id: string;
    display_name: string;
    logo: string;
    country: string;
    guides: string[];
  };

  export type CodeBase = {
    date: number;
    codes: Code[];
  };

  export type CodeBaseSorted = {
    [key: string]: Code;
  };

  export type CodeMatch = {
    score: number;
    match: string;
    code: Code | null;
  };

  export type Channel = {
    "@_id": string;
    "display-name": string;
    icon: {
      "@_src": string;
    };
  };

  export type Programme = {
    "@_start": string;
    "@_stop": string;
    "@_channel": string;
    title: { "#text": string; "@_lang": string };
  };

  export type Base = {
    date: number;
    epg: {
      channel: Channel[];
      programme: Programme[];
    };
  };

  export type MatchOptions = {
    name?: string | string[];
    id?: string | string[];
    formatted?: boolean;
    listAll?: boolean;
  };

  export type MatchOptionsSingle = {
    id?: string;
    name?: string;
  };

}
