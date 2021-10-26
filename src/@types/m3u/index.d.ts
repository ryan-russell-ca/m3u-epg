declare module "M3U" {
  export type Base = {
    date: number;
    m3u: Group[];
  };

  export type Group = NameGroup & {
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

  export type CustomMapping = {
    originalName: string;
    name: string | null;
    id: string | null;
    logo: string | null;
    country: string | null;
    confirmed: boolean;
  };

  export type CustomMappings = {
    [url: string]: CustomMapping;
  };

  export type NameGroup = {
    region?: string;
    nameCode?: string;
    name?: string;
    definition?: string;
  };

  export type NameGroupMatch = {
    groups?: NameGroup;
  };
}
