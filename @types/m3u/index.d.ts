declare module "M3U" {
  export type Group = {
    extInf: string;
    group: string;
    id: string;
    logo: string;
    name: string;
    originalName: string;
    parsedName: string;
    url?: string;
    country: string | null;
  };
}
