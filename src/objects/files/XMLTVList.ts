import { j2xParser } from "fast-xml-parser";
import XMLTV from "./XMLTV";
import EPG from "EPG";

const XML_PARSE_OPTIONS = {
  ignoreAttributes: false,
};

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

    this._xmlTvs = await this.getJson(xmlTvUrls);

    this._loaded = true;

    return this._xmlTvs;
  };

  public mergeByCode = (codes: { [id: string]: string }) => {
    if (!this._xmlTvs) {
      throw new Error("[XMLTVList]: XMLTV list is empty");
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
      throw new Error("[XMLTVList]: XMLTVs is empty");
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
    const xmlTvs = xmlTvUrls.reduce<{ [key: string]: XMLTV }>((acc, url) => {
      acc[url] = new XMLTV(url, XML_PARSE_OPTIONS);
      return acc;
    }, {});

    await Promise.all(Object.values(xmlTvs).map((xmlTv) => xmlTv.load()));

    return xmlTvs;
  };
}

export default XMLTVList;
