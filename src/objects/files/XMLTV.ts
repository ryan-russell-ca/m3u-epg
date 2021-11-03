import xmlParser from "fast-xml-parser";
import { getFromUrl, getJson, parseXmlDate } from "@shared/functions";
import Logger from "@shared/Logger";
import {
  XMLTVChannelModel,
  XMLTVModel,
  XMLTVProgrammeModel,
} from "@objects/database/XMLTVSchema";
import MongoConnector from "@objects/database/Mongo";

const XMLTV_TIME_AHEAD_MILLI =
  parseInt(process.env.XMLTV_TIME_AHEAD_SECONDS as string) * 1000;
const XMLTV_TIME_BEHIND_MILLI =
  parseInt(process.env.XMLTV_TIME_BEHIND_SECONDS as string) * 1000;

class XMLTV {
  private _loaded = false;
  private _valid = false;
  private _json?: XMLTV.BaseDocument;
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

    const json = JSON.parse(xmlTvJson) as XMLTV.Base;

    const xmlTv = new XMLTV(name, parseOptions);

    await xmlTv.loadFromJSON(json);

    return xmlTv;
  };

  public load = async (
    filterIds?: string[]
  ): Promise<XMLTV.BaseDocument | null> => {
    if (this._json) {
      this._loaded = true;
      return this._json;
    }

    try {
      if (!MongoConnector.connected) {
        await MongoConnector.connect();
      }

      this._json = await this.getXMLTV(this._url, filterIds);

      this._loaded = true;

      return this._json;
    } catch (err) {
      return null;
    }
  };

  public getByCode = (
    code: string
  ): {
    channel: XMLTV.ChannelModel;
    programme: XMLTV.ProgrammeModel[];
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

        if (diff < -3600001 || diff > XMLTV_TIME_AHEAD_MILLI) {
          return false;
        }

        return true;
      });

      return channel
        ? {
            channel: {
              "@_id": channel["@_id"],
              "display-name": channel["display-name"],
              icon: channel.icon,
            },
            programme: programme.map((p) => ({
              "@_start": p["@_start"],
              "@_stop": p["@_stop"],
              "@_channel": p["@_channel"],
              title: p.title,
            })),
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

  public get url() {
    return this._url;
  }

  public get isValid() {
    return this._valid;
  }

  private loadFromJSON = async (json: XMLTV.Base) => {
    this._loaded = true;

    const { xmlTv, xmlTvChannels, xmlTvProgrammes } = await this.populateModels(
      json
    );

    this.saveModels(xmlTv, xmlTvChannels, xmlTvProgrammes);

    this._valid = true;

    return xmlTv;
  };

  private getXMLTV = async (
    url: string,
    filterIds?: string[],
    refresh = false
  ) => {
    try {
      if (refresh) {
        Logger.info("[XMLTV.getXMLTV]: Forcing refresh");
        throw new Error();
      }

      const xmlTv = await XMLTVModel.findOne({ url })
        .populate("xmlTv.channel")
        .populate("xmlTv.programme");

      if (!xmlTv) {
        throw new Error();
      }

      if (filterIds) {
        xmlTv.xmlTv = this.filterDocumentIds(xmlTv, filterIds);
        await xmlTv.save();
      }

      this._valid = true;

      return xmlTv;
    } catch (error) {
      Logger.info("[XMLTV.getXMLTV]: No XMLTV entry found");
      const json = await this.getJson(url, filterIds);

      if (!json?.xmlTv.channel || !json?.xmlTv.programme) {
        Logger.info(`[XMLTV.getJson]: Invalid XMLTV | ${this._url}`);
        this._valid = false;
        throw new Error();
      }

      const { xmlTv, xmlTvChannels, xmlTvProgrammes } =
        await this.populateModels(json);

      await this.saveModels(xmlTv, xmlTvChannels, xmlTvProgrammes);

      this._valid = true;

      return xmlTv;
    }
  };

  private filterProgammesByTime = (programmes: XMLTV.ProgrammeModel[]) => {
    const filteredProgrammes = programmes.filter((programme) => {
      const { year, month, day, hour, minute, second } = parseXmlDate(
        programme["@_start"]
      );

      if (year < 2011) {
        return true;
      }

      const date = new Date(Date.UTC(year, month, day, hour, minute, second));

      const diff = date.getTime() - new Date().getTime();

      if (diff < -XMLTV_TIME_BEHIND_MILLI || diff > XMLTV_TIME_AHEAD_MILLI) {
        return false;
      }

      return true;
    });

    if (!filteredProgrammes.length) {
      Logger.info(
        `[XMLTV.filterProgammesByTime]: ${this._url} has not entries within date range`
      );
    }

    return filteredProgrammes;
  };

  private filterDocumentIds = (
    xmlTv: XMLTV.BaseDocument,
    filterIds: string[]
  ) => {
    return {
      channel: xmlTv.xmlTv.channel.filter((channel) =>
        filterIds.includes(channel["@_id"])
      ),
      programme: xmlTv.xmlTv.programme.filter((programme) =>
        filterIds.includes(programme["@_channel"])
      ),
    };
  };

  private filterModelIds = (
    channels: XMLTV.ChannelModel[],
    programmes: XMLTV.ProgrammeModel[],
    filterIds: string[]
  ) => {
    return {
      channel: channels.filter((channel) =>
        filterIds.includes(channel["@_id"])
      ),
      programme: programmes.filter((programme) =>
        filterIds.includes(programme["@_channel"])
      ),
    };
  };

  private saveModels = async (
    xmlTv: XMLTV.BaseDocument,
    xmlTvChannels: XMLTV.ChannelDocument[],
    xmlTvProgrammes: XMLTV.ProgrammeDocument[]
  ) => {
    await XMLTVChannelModel.bulkSave(xmlTvChannels);
    await XMLTVProgrammeModel.bulkSave(xmlTvProgrammes);
    await xmlTv.save();

    return true;
  };

  private populateModels = async (
    json: XMLTV.Base
  ): Promise<{
    xmlTv: XMLTV.BaseDocument;
    xmlTvChannels: XMLTV.ChannelDocument[];
    xmlTvProgrammes: XMLTV.ProgrammeDocument[];
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

  private getJson = async (
    url: string,
    filterIds?: string[]
  ): Promise<XMLTV.Base | null> => {
    Logger.info(`[XMLTV.getJson]: Refreshing | ${url}`);

    const fileXml = await getFromUrl(url);

    if (xmlParser.validate(fileXml) === true) {
      const json = xmlParser.parse(fileXml, this._parseOptions).tv;

      const { channel, programme } = filterIds
        ? this.filterModelIds(json.channel, json.programme, filterIds)
        : json;

      const filteredChannel = (channel as XMLTV.ChannelModel[]).filter(
        (c, i, channels) =>
          i === channels.findIndex((cc) => cc["@_id"] === c["@_id"])
      );

      const filteredProgramme = this.filterProgammesByTime(
        (programme as XMLTV.ProgrammeModel[]).filter(
          (p, i, programmes) =>
            i ===
            programmes.findIndex(
              (pp) =>
                pp["@_channel"] === p["@_channel"] &&
                pp["@_start"] === p["@_start"]
            )
        )
      );

      const xmlTvJson = {
        url: this._url,
        xmlTv: {
          channel: filteredChannel,
          programme: filteredProgramme,
        },
      };

      return xmlTvJson;
    }

    return null;
  };
}

export default XMLTV;
