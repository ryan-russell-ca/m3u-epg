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

}

