import { j2xParser } from "fast-xml-parser";
import XMLTV from "./XMLTV";

const XML_PARSE_OPTIONS = {
  ignoreAttributes: false,
};

const CUSTOM_XMLTV_MAPPINGS_FILE = process.env
  .CUSTOM_XMLTV_MAPPINGS_FILE as string;

class XMLTVList {
  private _loaded = false;
  private _xmlTvs?: { [xmlTvUrl: string]: XMLTV } = {};
  private _fullXmlTv?: EPG.Base;

  public load = async (
    xmlTvUrls: string[],
    filterIds?: string[]
  ): Promise<{ [key: string]: XMLTV }> => {
    if (this._xmlTvs && Object.keys(this._xmlTvs).length) {
      this._loaded = true;
      return this._xmlTvs;
    }

    const xmlTvs = await this.getJson(xmlTvUrls, filterIds);

    const custom = await XMLTV.fromFile(
      "custom",
      CUSTOM_XMLTV_MAPPINGS_FILE,
      XML_PARSE_OPTIONS
    );

    this._xmlTvs = {
      ...xmlTvs,
      custom,
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
        if (!xmlTvs[xmlListUrl]) {
          return acc;
        }

        const { channel, programme } = xmlTvs[xmlListUrl].getByCode(id) || {};

        if (channel && programme) {
          acc.xmlTv.channel.push(channel);
          acc.xmlTv.programme.push(...programme);
        }

        return acc;
      },
      {
        date: new Date(),
        url: "full",
        xmlTv: {
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
      parser.parse({ tv: this._fullXmlTv?.xmlTv }).toString()
    );
  };

  private getJson = async (
    xmlTvUrls: string[],
    filterIds?: string[]
  ): Promise<{ [xmlTvUrl: string]: XMLTV }> => {
    const xmlTvsDictionary = xmlTvUrls.reduce<{ [xmlTvUrl: string]: XMLTV }>(
      (acc, url) => {
        acc[url] = new XMLTV(url, XML_PARSE_OPTIONS);
        return acc;
      },
      {}
    );

    const xmlTvValues = Object.values(xmlTvsDictionary);
    const xmlTvs = {} as { [xmlTvUrl: string]: XMLTV };

    for (let i = 0; i < xmlTvValues.length; i++) {
      const xmlTv = xmlTvValues[i] as XMLTV;
      await xmlTv.load(filterIds);
      
      if (xmlTv.isValid) {
        xmlTvs[xmlTv.url] = xmlTv;
      }
    }

    return xmlTvs;
  };
}

export default XMLTVList;
