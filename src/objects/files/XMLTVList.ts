import { j2xParser } from "fast-xml-parser";
import XMLTV from "./XMLTV";

const XML_PARSE_OPTIONS = {
  ignoreAttributes: false,
};

const CUSTOM_XMLTV_MAPPINGS_FILE = process.env
  .CUSTOM_XMLTV_MAPPINGS_FILE as string;

class XMLTVList {
  private _loaded = false;
  private _xmlTvs?: { [xmlTvUrl: string]: XMLTV };
  private _fullXmlTv?: EPG.Base;

  public load = async (
    xmlTvUrls: string[]
  ): Promise<{ [key: string]: XMLTV }> => {
    if (this._xmlTvs) {
      this._loaded = true;
      return this._xmlTvs;
    }

    this._xmlTvs = {
      ...(await this.getJson(xmlTvUrls)),
      custom: await XMLTV.fromFile(
        "custom",
        CUSTOM_XMLTV_MAPPINGS_FILE,
        XML_PARSE_OPTIONS
      ),
    };

    this._loaded = true;

    return this._xmlTvs;
  };

  public mergeByCode = (codes: { [id: string]: string }) => {
    if (!this._xmlTvs) {
      throw new Error("[XMLTVList.mergeByCode]: XMLTV list is empty");
    }

    const xmlTvs = this._xmlTvs;

    this._fullXmlTv = Object.entries(codes).reduce<EPG.Base>(
      (acc, [id, xmlListUrl]) => {
        const { channel, programme } = xmlTvs[xmlListUrl].getByCode(id) || {};

        if (channel && programme) {
          acc.epg.channel.push(channel);
          acc.epg.programme.push(...programme);
        }

        return acc;
      },
      {
        date: Date.now(),
        epg: {
          channel: [],
          programme: [],
        },
      }
    );
  };

  public get isLoaded() {
    return this._loaded;
  }

  public toString = () => {
    if (!this._xmlTvs) {
      throw new Error("[XMLTVList.toString]: XMLTVs is empty");
    }

    const parser = new j2xParser(XML_PARSE_OPTIONS);

    return (
      '<?xml version="1.0" encoding="UTF-8" ?>' +
      parser.parse({ tv: this._fullXmlTv?.epg }).toString()
    );
  };

  private getJson = async (
    xmlTvUrls: string[]
  ): Promise<{ [xmlTvUrl: string]: XMLTV }> => {
    const xmlTvs = xmlTvUrls.reduce<{ [xmlTvUrl: string]: XMLTV }>(
      (acc, url) => {
        acc[url] = new XMLTV(url, XML_PARSE_OPTIONS);
        return acc;
      },
      {}
    );

    await Promise.all(Object.values(xmlTvs).map((xmlTv) => xmlTv.load()));

    return xmlTvs;
  };
}

export default XMLTVList;
