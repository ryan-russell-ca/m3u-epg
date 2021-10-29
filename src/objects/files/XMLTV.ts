import URL from "url";
import xmlParser from "fast-xml-parser";
import {
  getFromUrl,
  getJson,
  parseXmlDate,
  saveJson,
  validateDateOrThrow,
} from "@shared/functions";
import Logger from "@shared/Logger";

const EPG_FILES_DIR = process.env.EPG_FILES_DIR as string;
const EPG_TIME_AHEAD_MILLI =
  parseInt(process.env.EPG_TIME_AHEAD_SECONDS as string) * 1000;

class XMLTV {
  private _loaded = false;
  private _json?: EPG.Base;
  private _url: string;
  private _urlObj: URL.UrlWithStringQuery;
  private _parseOptions: {
    ignoreAttributes: boolean;
  };

  constructor(
    url: string,
    parseOptions: {
      ignoreAttributes: boolean;
    }
  ) {
    this._url = url;
    this._urlObj = URL.parse(url);
    this._parseOptions = parseOptions;
  }

  public static fromFile = async (
    name: string,
    filename: string,
    parseOptions: {
      ignoreAttributes: boolean;
    }
  ) => {
    const epgJson = await getJson(filename);
    const json = JSON.parse(epgJson) as EPG.Base;
    const xmlTv = new XMLTV(name, parseOptions);
    xmlTv.loadFromJSON(json);
    return xmlTv;
  };

  public load = async (): Promise<EPG.Base> => {
    if (this._json) {
      this._loaded = true;
      return this._json;
    }

    this._json = await this.getJson();

    this._loaded = true;

    return this._json;
  };

  public getByCode = (
    code: string
  ): {
    channel: EPG.Channel;
    programme: EPG.Programme[];
  } | null => {
    if (!this._json) {
      throw new Error("[XMLTV.getByCode]: XMLTV is empty");
    }

    try {
      const channel = this._json.epg.channel.find(
        (channel) => channel["@_id"] === code
      );

      const programme = this._json.epg.programme.filter((programme) => {
        if (programme["@_channel"] !== code) {
          return false;
        }

        const { year, month, day, hour, minute, second } = parseXmlDate(
          programme["@_start"]
        );

        if (year < 2011) {
          return true;
        }

        const date = new Date(Date.UTC(year, month, day, hour, minute, second));

        const diff = date.getTime() - new Date().getTime();

        if (diff < -3600001 || diff > EPG_TIME_AHEAD_MILLI) {
          return false;
        }

        return true;
      });

      return channel
        ? {
            channel,
            programme,
          }
        : null;
    } catch (err) {
      Logger.info(`[XMLTV.getByCode]: '${code}' not found`);
      return null;
    }
  };

  public get isLoaded() {
    return this._loaded;
  }

  private loadFromJSON = (json: EPG.Base) => {
    this._loaded = true;
    this._json = json;
  };

  private getJson = async (): Promise<EPG.Base> => {
    const filename = `${EPG_FILES_DIR}/${this.createFilename()}.json`;

    try {
      const xmlTvFile = await getJson(filename);

      const json = JSON.parse(xmlTvFile) as EPG.Base;

      validateDateOrThrow(json.date, `Outdated: [${filename}]`);

      return json;
    } catch (err: any) {
      Logger.info(`[XMLTV.getJson]: Refreshing | ${this._url}`);

      const fileXml = await getFromUrl(this._url);

      if (xmlParser.validate(fileXml) === true) {
        const json = xmlParser.parse(fileXml, this._parseOptions);

        const xmlTvJson = {
          date: Date.now(),
          epg: json.tv,
        };

        saveJson(filename, xmlTvJson);

        return xmlTvJson;
      }
    }

    return {
      date: Date.now(),
      epg: {
        channel: [],
        programme: [],
      },
    };
  };

  private createFilename = () => {
    return this._urlObj?.pathname?.split("/").slice(-2).join("-");
  };
}

export default XMLTV;
