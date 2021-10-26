namespace EPG {
  export interface Code {
    tvg_id: string;
    display_name: string;
    logo: string;
    country: string;
    guides: string[];
  };

  export interface CodeBase {
    date: number;
    codes: Code[];
  };

  export interface CodeBaseSorted {
    [key: string]: Code;
  };

  export interface CodeMatch {
    score: number;
    match: string;
    code: Code | null;
  };

  export interface Channel {
    "@_id": string;
    "display-name": string;
    icon: {
      "@_src": string;
    };
  };

  export interface Programme {
    "@_start": string;
    "@_stop": string;
    "@_channel": string;
    title: { "#text": string; "@_lang": string };
  };

  export interface Base {
    date: number;
    epg: {
      channel: Channel[];
      programme: Programme[];
    };
  };

  export interface MatchOptions {
    name?: string | string[];
    id?: string | string[];
    formatted?: boolean;
    listAll?: boolean;
  };

  export interface MatchOptionsSingle {
    id?: string;
    name?: string;
  };

}
