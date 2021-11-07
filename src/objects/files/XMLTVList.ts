import { j2xParser } from "fast-xml-parser";
import XMLTV from "./XMLTV";
import Logger from "@shared/Logger";

export const XML_PARSE_OPTIONS = {
  ignoreAttributes: false,
};

const CUSTOM_XMLTV_MAPPINGS_FILE = process.env
  .CUSTOM_XMLTV_MAPPINGS_FILE as string;

class XMLTVList {
  private _loaded = false;
  private _model?: { [xmlTvUrl: string]: XMLTV } = {};

  public load = async (
    xmlTvUrls: string[],
    filterIds?: string[]
  ): Promise<{ [key: string]: XMLTV }> => {
    if (this._model && Object.keys(this._model).length) {
      this._loaded = true;
      return this._model;
    }

    const xmlTvs = await this.getJson(xmlTvUrls, filterIds);

    const custom = await XMLTV.fromFile(
      "custom",
      CUSTOM_XMLTV_MAPPINGS_FILE,
      XML_PARSE_OPTIONS
    );

    this._model = {
      ...xmlTvs,
      custom,
    };
    
    this._loaded = true;

    return this._model;
  };

  public save = async () => {
    if (!this._model) {
      throw new Error("[XMLTVList.save]: XMLTV JSON is empty");
    }

    const xmlTvs = Object.values(this._model);

    Logger.info("[XMLTVList.save]: Saving XMLTVListl files");
    for (const xmlTv of xmlTvs) {
      await xmlTv.save();
    }

    return true;
  };

  public get isLoaded() {
    return this._loaded;
  }

  public toString = () => {
    if (!this._model) {
      throw new Error("[XMLTVList.toString]: XMLTVs is empty");
    }

    const parser = new j2xParser(XML_PARSE_OPTIONS);
    
    return (
      '<?xml version="1.0" encoding="UTF-8" ?>' +
      parser.parse({ tv: this.merge(this._model) }).toString()
    );
  };

  private merge = (xmlTvs: { [xmlTvUrl: string]: XMLTV }) => {
    if (!xmlTvs) {
      throw new Error("[XMLTVList.mergeByCode]: XMLTV list is empty");
    }
    // console.log('start merge');
    // console.log(Object.values(xmlTvs).map((x) => x.getChannel()));
    
    return Object.values(xmlTvs).reduce<{
      channel: XMLTV.ChannelModel[];
      programme: XMLTV.ProgrammeModel[];
    }>(
      (acc, xmlTv) => {
        acc.channel = acc.channel.concat(xmlTv.getChannel());
        acc.programme = acc.programme.concat(xmlTv.getProgramme());

        return acc;
      },
      {
        channel: [],
        programme: [],
      }
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
