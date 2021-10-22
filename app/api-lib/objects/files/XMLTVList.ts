import fs from 'fs';
import path from 'path';
import XMLTV from './XMLTV';

export const XML_PARSE_OPTIONS = {
  ignoreAttributes: false,
  format: true,
};

const CUSTOM_XMLTV_MAPPINGS_FILE = process.env
  .CUSTOM_XMLTV_MAPPINGS_FILE as string;

class XMLTVList {
  private _loaded = false;
  private _model?: { [xmlTvUrl: string]: XMLTV } = {};

  public load = async (
    xmlTvUrls: string[],
    filterIds?: string[]
  ): Promise<boolean> => {
    if (this._model && Object.keys(this._model).length) {
      this._loaded = true;
      return false;
    }

    const xmlTvs = await this.getJson(xmlTvUrls, filterIds);

    const custom = await XMLTV.fromFile(
      'custom',
      CUSTOM_XMLTV_MAPPINGS_FILE,
      XML_PARSE_OPTIONS
    );

    this._model = {
      ...xmlTvs,
      custom,
    };

    this._loaded = true;

    return true;
  };

  public get isLoaded() {
    return this._loaded;
  }

  public toString = () => {
    if (!this._model) {
      throw new Error('[XMLTVList.toString]: XMLTVs is empty');
    }

    return this.parseMerge(this._model);
  };

  private parseMerge = (xmlTvs: { [xmlTvUrl: string]: XMLTV }) => {
    if (!xmlTvs) {
      throw new Error('[XMLTVList.parseMergeByCode]: XMLTV list is empty');
    }

    const { channel, programme } = Object.values(xmlTvs).reduce<{
      channel: string;
      programme: string;
    }>(
      (acc, xmlTv) => {
        const channel = xmlTv.getChannel(true);
        const programme = xmlTv.getProgramme(true);

        if (channel.length && programme.length) {
          acc.channel += channel;
          acc.programme += programme;
        }

        return acc;
      },
      { channel: '', programme: '' }
    );

    const xmlPath = path.join(`./data/playlist/${'epg'}.xml`);
    const data = `
      <?xml version="1.0" encoding="UTF-8" ?>
      <tv>
        ${channel}
        ${programme}
      </tv>
    `.trim();

    fs.writeFileSync(xmlPath, data);

    return {
      filename: xmlPath,
      size: data.length,
    };
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
