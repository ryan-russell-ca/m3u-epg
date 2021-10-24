declare module "XML" {
  export type xmlDateStrings = {
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
    second: string;
    offsetHour: string;
    offsetMinute: string;
  };

  export type xmlDate = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    offsetHour: number;
    offsetMinute: number;
  };
}
