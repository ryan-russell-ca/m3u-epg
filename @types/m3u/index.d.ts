declare module "M3U" {
  export type Base = {
    date: number;
    m3u: Group[];
  };

  export type Group = {
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

  export type CustomMappings = {
    [url: string]: {
      originalName: string;
      name: string | null;
      id: string | null;
      logo: string | null;
      country: string | null;
      confirmed: boolean;
    };
  };
}
