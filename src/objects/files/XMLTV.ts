import xmlParser from "fast-xml-parser";
import { filterProgrammeByDate, getFromUrl, getJson } from "@shared/functions";
import Logger from "@shared/Logger";
import {
  XMLTVChannelModel,
  XMLTVModel,
  XMLTVProgrammeModel,
} from "@objects/database/XMLTVSchema";
import MongoConnector from "@objects/database/Mongo";

const XMLTV_EXPIRATION_MILLI =
  parseInt(process.env.XMLTV_EXPIRATION_SECONDS as string) * 1000;

class XMLTV {
  private _expired = false;
  private _loaded = false;
  private _valid = false;
  private _model?: XMLTV.BaseDocument;
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
    const xmlTvModel = await getJson(filename);

    const json = JSON.parse(xmlTvModel) as XMLTV.Base;

    const xmlTv = new XMLTV(name, parseOptions);

    await xmlTv.loadFromJSON(json);

    return xmlTv;
  };

  public load = async (
    filterIds?: string[],
    refresh = false
  ): Promise<boolean> => {
    if (this.model && !refresh && !this.expired) {
      this._loaded = true;
      return false;
    }

    if (!MongoConnector.connected) {
      await MongoConnector.connect();
    }

    this._model = await this.getXMLTV(this._url, filterIds, refresh);

    await this.save();

    this._loaded = true;

    return true;
  };

  public getByTvgId = (
    tvgId: string
  ): {
    channel: XMLTV.ChannelModel;
    programme: XMLTV.ProgrammeModel[];
  } | null => {
    try {
      if (!this._model) {
        throw new Error("[XMLTV.getByCode]: XMLTV is empty");
      }

      const channel = this._model.xmlTv.channel.find(
        (channel) => channel["@_id"] === tvgId
      );

      const programme = this._model.xmlTv.programme.filter(
        (programme) => programme["@_channel"] === tvgId
      );

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
    } catch (error) {
      Logger.info(`[XMLTV.getByCode]: '${tvgId}' not found`);
      return null;
    }
  };

  public getChannel = (): XMLTV.ChannelModel[] => {
    if (!this._model) {
      throw new Error("[XMLTV.getChannel]: XMLTV JSON is empty");
    }

    return this._model.xmlTv.channel.map((c) => ({
      "@_id": c["@_id"],
      "display-name": c["display-name"],
      icon: c.icon,
    }));
  };

  public getProgramme = (): XMLTV.ProgrammeModel[] => {
    if (!this._model) {
      throw new Error("[XMLTV.getProgramme]: XMLTV JSON is empty");
    }

    return this._model.xmlTv.programme.map((p) => ({
      "@_start": p["@_start"],
      "@_stop": p["@_stop"],
      "@_channel": p["@_channel"],
      title: p.title,
    }));
  };

  public get id() {
    return this.model?.id;
  }

  public get isLoaded() {
    return this._loaded;
  }

  public get url() {
    return this._url;
  }

  public get isValid() {
    return this._valid;
  }

  private get expired() {
    return this._expired;
  }

  private get model() {
    if (this._model && this.checkExpired(this._model)) {
      this._expired = true;
    }

    return this._model;
  }

  private checkExpired = (model: XMLTV.BaseDocument) => {
    return (model?.date?.getTime() || 0) + XMLTV_EXPIRATION_MILLI - 1 < Date.now();
  };

  private loadFromJSON = async (base: XMLTV.Base) => {
    this._loaded = true;

    const xmlTv = await this.populateModels(base);

    this._model = xmlTv;

    this._valid = true;

    return xmlTv;
  };

  private getXMLTV = async (
    url: string,
    filterIds?: string[],
    refresh?: boolean
  ) => {
    try {
      if (refresh) {
        Logger.info("[XMLTV.getXMLTV]: Forcing refresh...");
        return this.createXmlTv(url, filterIds);
      }

      const model = await XMLTVModel.findOne(
        { url },
        {},
        { sort: { date: -1 } }
      )
        .populate("xmlTv.channel")
        .populate("xmlTv.programme");

      if (!model) {
        Logger.info("[XMLTV.getXMLTV]: No XMLTV entry found");
        return this.createXmlTv(url, filterIds);
      }

      if (this.checkExpired(model)) {
        Logger.info("[XMLTV.getXMLTV]: XMLTV entry expired");
        return this.createXmlTv(url, filterIds);
      }

      Logger.info(
        `[XMLTV.getXMLTV]: Found ${model.xmlTv.channel.length} XMLTV channels and ${model.xmlTv.programme.length} programmes`
      );

      if (!model?.xmlTv.channel || !model?.xmlTv.programme) {
        Logger.info(`[XMLTV.getXMLTV]: Invalid XMLTV | ${this._url}`);
        throw new Error();
      }

      this._valid = true;

      return model;
    } catch (error) {
      Logger.err(error);
      throw error;
    }
  };

  private filterProgammesByTime = (programmes: XMLTV.ProgrammeModel[]) => {
    const filteredProgrammes = programmes.filter(filterProgrammeByDate);

    if (!filteredProgrammes.length) {
      Logger.info(
        `[XMLTV.filterProgammesByTime]: ${this._url} has not entries within date range`
      );
    }

    return filteredProgrammes;
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

  public save = async () => {
    if (this._url === "custom") {
      Logger.info("[XMLTV.save]: Skipping save XMLTV custom channel files");
      return true;
    }

    if (!this._model) {
      throw new Error("[XMLTV.save]: XMLTV JSON is empty");
    }

    Logger.info("[XMLTV.save]: Saving XMLTV channel files");
    await XMLTVChannelModel.bulkSave(this._model?.xmlTv.channel);

    Logger.info("[XMLTV.save]: Saving XMLTV programme files");
    await XMLTVProgrammeModel.bulkSave(this._model?.xmlTv.programme);

    Logger.info("[XMLTV.save]: Saving XMLTV file");
    await this._model.save();

    return true;
  };

  private populateModels = async (model: XMLTV.Base): Promise<XMLTV.BaseDocument> => {
    const channels = await XMLTVChannelModel.find({
      "@_id": model.xmlTv.channel.map((channel) => channel["@_id"]),
    });

    const xmlTvChannels = model.xmlTv.channel.map(
      (channel) =>
        channels.find((p) => p["@_id"] === channel["@_id"]) ||
        new XMLTVChannelModel(channel)
    );

    const programmes = await XMLTVProgrammeModel.find({
      $or: model.xmlTv.programme.map((programme) => ({
        "@_channel": programme["@_channel"],
        "@_start": programme["@_start"],
      })),
    });

    const xmlTvProgrammes = model.xmlTv.programme.map(
      (programme) =>
        programmes.find(
          (p) =>
            p["@_channel"] === programme["@_channel"] &&
            p["@_start"] === programme["@_start"]
        ) || new XMLTVProgrammeModel(programme)
    );

    const xmlTv = await XMLTVModel.findOne(
      { url: model.url },
      {},
      { sort: { date: -1 } }
    );

    if (!xmlTv) {
      return new XMLTVModel({
        url: model.url,
        xmlTv: {
          channel: xmlTvChannels,
          programme: xmlTvProgrammes,
        },
      });
    }

    xmlTv.set({
      date: Date.now(),
      xmlTv: {
        channel: xmlTvChannels,
        programme: xmlTvProgrammes,
      },
    });

    return xmlTv;
  };

  private createXmlTv = async (
    url: string,
    filterIds?: string[]
  ): Promise<Promise<XMLTV.BaseDocument>> => {
    Logger.info("[XMLTV.createXmlTv]: Creating XMLTV...");

    const xml = await this.getJson(url);

    const validation = xmlParser.validate(xml);

    if (validation === true) {
      const json = xmlParser.parse(xml, this._parseOptions).tv;

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

      this._expired = false;

      return await this.populateModels(
        {
          url: url,
          xmlTv: {
            channel: filteredChannel,
            programme: filteredProgramme,
          },
        }
      );
    }

    throw validation;
  };

  private getJson = async (url: string) => {
    Logger.info(`[XMLTV.getJson]: Downloading XML from ${url}...`);

    if (process.env.XMLTV_STATIC_DATA_FILE) {
      return await getJson(process.env.XMLTV_STATIC_DATA_FILE);
    }

    return await getFromUrl(url);
  };
}

export default XMLTV;
