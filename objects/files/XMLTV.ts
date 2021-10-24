import URL from "url";
import xmlParser from "fast-xml-parser";
import {
  getFromUrl,
  getJson,
  parseXmlDate,
  saveJson,
  validateDateOrThrow,
} from "@shared/functions";
import EPG from "EPG";

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

  public load = async (): Promise<EPG.Base> => {
    if (this._json) {
      this._loaded = true;
      return this._json;
    }

    this._json = await this.getJson();

    this._loaded = true;

    return this._json;
  };

  public getByCode = (code: string) => {
    if (!this._json) {
      throw new Error("[XMLTV]: XMLTV is empty");
    }
    
    const channel = this._json.epg.channel.find(
      (channel) => channel["@_id"] === code
    );

    const programme = this._json.epg.programme.filter(
      (programme) => {
        if (programme["@_channel"] !== code) {
          return false;
        }
      
        const { year, month, day, hour, minute, second } = parseXmlDate(
          programme["@_start"]
        );
        const date = new Date(Date.UTC(year, month, day, hour, minute, second));

        const diff = date.getTime() - Date.now();

        if (diff < -3600001 || diff > EPG_TIME_AHEAD_MILLI) {
          return false;
        }

        return true;
      }
    );

    return {
      channel,
      programme,
    };
  };

  public get isLoaded() {
    return this._loaded;
  }

  private getJson = async (): Promise<EPG.Base> => {
    const filename = `${EPG_FILES_DIR}/${this.createFilename()}.json`;

    try {
      const xmlTvFile = await getJson(filename);

      const json = JSON.parse(xmlTvFile) as EPG.Base;

      validateDateOrThrow(json.date, `Outdated: [${filename}]`);

      return json;
    } catch (err: any) {
      console.log(`Refreshing: [${this._url}]`);

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