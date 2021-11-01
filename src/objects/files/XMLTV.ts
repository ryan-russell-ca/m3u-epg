import xmlParser from "fast-xml-parser";
import { getFromUrl, getJson, parseXmlDate } from "@shared/functions";
import Logger from "@shared/Logger";
import {
  XMLTVChannelModel,
  XMLTVModel,
  XMLTVProgrammeModel,
} from "@objects/database/XMLTVSchema";
import MongoConnector from "@objects/database/Mongo";

const EPG_TIME_AHEAD_MILLI =
  parseInt(process.env.EPG_TIME_AHEAD_SECONDS as string) * 1000;

class XMLTV {
  private _loaded = false;
  private _valid = false;
  private _json?: EPG.BaseDocument;
  private _url: string;
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
    this._parseOptions = parseOptions;
  }

  public static fromFile = async (
    name: string,
    filename: string,
    parseOptions: {
      ignoreAttributes: boolean;
    }
  ) => {
    const xmlTvJson = await getJson(filename);

    const json = JSON.parse(xmlTvJson) as EPG.Base;

    const xmlTv = new XMLTV(name, parseOptions);

    await xmlTv.loadFromJSON(json);

    return xmlTv;
  };

  public load = async (
    filterIds?: string[]
  ): Promise<EPG.BaseDocument | null> => {
    if (this._json) {
      this._loaded = true;
      return this._json;
    }

    try {
      if (!MongoConnector.connected) {
        await MongoConnector.connect();
      }

      this._json = await this.getXMLTV(filterIds);

      this._loaded = true;

      return this._json;
    } catch (err) {
      return null;
    }
  };

  public getByCode = (
    code: string
  ): {
    channel: EPG.ChannelDocument;
    programme: EPG.ProgrammeDocument[];
  } | null => {
    try {
      if (!this._json) {
        throw new Error("[XMLTV.getByCode]: XMLTV is empty");
      }

      const channel = this._json.xmlTv.channel.find(
        (channel) => channel["@_id"] === code
      );

      const programme = this._json.xmlTv.programme.filter((programme) => {
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
      console.log(err);
      
      Logger.info(`[XMLTV.getByCode]: '${code}' not found`);
      return null;
    }
  };

  public get isLoaded() {
    return this._loaded;
  }

  public get url() {
    return this._url;
  }

  public get isValid() {
    return this._valid;
  }

  private loadFromJSON = async (json: EPG.Base) => {
    this._loaded = true;

    const { xmlTv, xmlTvChannels, xmlTvProgrammes  } = await this.populateModels(
      json
    );

    await this.saveModels(xmlTv, xmlTvChannels, xmlTvProgrammes);

    this._valid = true;

    return xmlTv;
  };

  private getXMLTV = async (filterIds?: string[], refresh = false) => {
    try {
      if (refresh) {
        Logger.info("[XMLTV.getXMLTV]: Forcing refresh");
        throw new Error();
      }
      
      const xmlTv = await XMLTVModel.findOne()
        .sort({ date: 1, url: this._url })
        .populate("xmlTv.channel")
        .populate("xmlTv.programme");

      if (!xmlTv) {
        throw new Error();
      }

      const xmlTvChannels = xmlTv.xmlTv.channel;
      const xmlTvProgrammes = xmlTv.xmlTv.programme;

      if (filterIds) {
        xmlTv.xmlTv = this.filterIds(xmlTv, filterIds);
      }

      await this.saveModels(xmlTv, xmlTvChannels, xmlTvProgrammes);

      this._valid = true;

      return xmlTv;
    } catch (error) {
      Logger.info("[XMLTV.getXMLTV]: No XMLTV entry found");
      const json = await this.getJson();

      if (!json?.xmlTv.channel || !json?.xmlTv.programme) {
        Logger.info(`[XMLTV.getJson]: Invalid XMLTV | ${this._url}`);
        this._valid = false;
        throw new Error();
      }

      const { xmlTv, xmlTvChannels, xmlTvProgrammes } =
        await this.populateModels(json);

      if (filterIds) {
        xmlTv.xmlTv = this.filterIds(xmlTv, filterIds);
      }

      await this.saveModels(xmlTv, xmlTvChannels, xmlTvProgrammes);

      this._valid = true;

      return xmlTv;
    }
  };

  private filterIds = (xmlTv: EPG.BaseDocument, filterIds: string[]) => {
    return {
      channel: xmlTv.xmlTv.channel.filter((channel) =>
        filterIds.includes(channel["@_id"])
      ),
      programme: xmlTv.xmlTv.programme.filter((programme) =>
        filterIds.includes(programme["@_channel"])
      ),
    };
  };

  private saveModels = async (xmlTv: EPG.BaseDocument, xmlTvChannels: EPG.ChannelDocument[], xmlTvProgrammes: EPG.ProgrammeDocument[]) => {
    await XMLTVChannelModel.bulkSave(xmlTvChannels);
    await XMLTVProgrammeModel.bulkSave(xmlTvProgrammes);
    await xmlTv.save();

    return true;
  };

  private populateModels = async (
    json: EPG.Base
  ): Promise<{
    xmlTv: EPG.BaseDocument;
    xmlTvChannels: EPG.ChannelDocument[];
    xmlTvProgrammes: EPG.ProgrammeDocument[];
  }> => {
    const channels = await XMLTVChannelModel.find({
      "@_id": json.xmlTv.channel.map((channel) => channel["@_id"]),
    });

    const xmlTvChannels = json.xmlTv.channel.map(
      (channel) =>
        channels.find((p) => p["@_id"] === channel["@_id"]) ||
        new XMLTVChannelModel(channel)
    );

    const programmes = await XMLTVProgrammeModel.find({
      $or: json.xmlTv.programme.map((programme) => ({
        "@_channel": programme["@_channel"],
        "@_start": programme["@_start"],
      })),
    });

    const xmlTvProgrammes = json.xmlTv.programme.map(
      (programme) =>
        programmes.find(
          (p) =>
            p["@_channel"] === programme["@_channel"] &&
            p["@_start"] === programme["@_start"]
        ) || new XMLTVProgrammeModel(programme)
    );

    const xmlTv =
      (await XMLTVModel.findOne({ url: json.url })) ||
      new XMLTVModel({
        ...json,
        xmlTv: {
          channel: xmlTvChannels,
          programme: xmlTvProgrammes,
        },
      });

    return { xmlTv, xmlTvChannels, xmlTvProgrammes };
  };

  private getJson = async (): Promise<EPG.Base | null> => {
    Logger.info(`[XMLTV.getJson]: Refreshing | ${this._url}`);

    const fileXml = await getFromUrl(this._url);

    if (xmlParser.validate(fileXml) === true) {
      const json = xmlParser.parse(fileXml, this._parseOptions);

      const xmlTvJson = {
        date: new Date(),
        url: this._url,
        xmlTv: json.tv,
      };

      return xmlTvJson;
    }

    return null;
  };
}

export default XMLTV;
