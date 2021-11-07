import {
  getFromUrl,
  getJson,
  parseJson,
  filterUnique,
  filterRegion,
} from "@shared/functions";
import M3UModel, { M3UChannelModel } from "@objects/database/M3USchema";
import MongoConnector from "@objects/database/Mongo";
import Logger from "@shared/Logger";
import BaseFile from "./BaseFile";

const M3U_URL = process.env.M3U_URL as string;
const M3U_FILENAME = process.env.M3U_FILENAME as string;
const CONFIRMED_MAPPINGS_FILE = process.env.CONFIRMED_MAPPINGS_FILE as string;
const M3U_EXPIRATION_MILLI =
  parseInt(process.env.M3U_EXPIRATION_SECONDS as string) * 1000;

export enum Definition {
  FullHighDef = "FHD",
  HighDef = "HD",
  StandardDef = "SD",
  Unknown = "UNKNOWN",
}

class M3UFile extends BaseFile<M3U.BaseDocument> {
  protected _expirationMilli = M3U_EXPIRATION_MILLI;
  private _matcher?: M3U.Matcher;

  public load = async (
    matcher: M3U.Matcher,
    refresh = false,
    uniqueOnly = true
  ) => {
    if (this.model && !refresh && !this.expired) {
      return false;
    }

    this._matcher = matcher;

    if (!MongoConnector.connected) {
      await MongoConnector.connect();
    }

    this._model = await this.getM3U(uniqueOnly, refresh);

    await this.save();

    this._loaded = true;

    return true;
  };

  // // TODO: Remove mutations to channels
  // public insertCodeInfo = async (codes: {
  //   [tvgId: string]: XMLTV.CodeDocument | M3U.CustomMapping;
  // }) => {
  //   if (!this._model) {
  //     throw new Error("[M3UFile]: M3U JSON is empty");
  //   }

  //   const tvgIds = this._model?.channels.reduce<M3U.ChannelInfoModel>((acc, channel) => {
  //     const channelJson = channel.toJSON();

  //     if (!channelJson.url) {
  //       return acc;
  //     }

  //     const code = codes[channelJson.url] as XMLTV.CodeDocument &
  //       M3U.CustomMapping;

  //     if (!code) {
  //       acc[channelJson.url] = {
  //         ...channelJson,
  //         confirmed: false,
  //         tvgId: null,
  //         logo: null,
  //         country: "unpoplated",
  //       };

  //       return acc;
  //     }

  //     const append = {
  //       tvgId: code.tvgId || "",
  //       name: code.displayName || code.name || channelJson.name,
  //       logo: channelJson.logo || code.logo,
  //       country: channelJson.country || code.country,
  //     };

  //     channel.set({
  //       ...append,
  //     });

  //     acc[channelJson.url] = {
  //       ...channelJson,
  //       ...append,
  //       confirmed: false,
  //     };

  //     return acc;
  //   }, {});
  // };

  // public customMap = (channel: M3U.ChannelInfoDocument) => {
  //   if (!this._mappings || !channel.url) {
  //     return null;
  //   }

  //   return this._mappings[channel.url];
  // };

  // public get channels(): M3U.ChannelInfoDocument[] {
  //   if (!this.isLoaded) {
  //     throw new Error("[M3UFile]: M3U JSON is not loaded");
  //   }

  //   return this._model?.channels || [];
  // }

  public get tvgIds() {
    const tvgIds = this._model?.channels.map((channel) => channel.tvgId).filter((c) => c);
    return (tvgIds || []) as string[];
  }

  // public getChannelJSON = (filters: M3U.ChannelInfoFilters) => {
  //   return this._model?.channels.filter((channel) => {
  //     return Object.entries(filters)
  //       .filter(([_, value]) => value)
  //       .every(([filter, value]) => {
  //         const regex = new RegExp(`^.*?(${value}).*$`, "gi");

  //         // @ts-ignore
  //         return regex.test(channel[filter]);
  //       });
  //   });
  // };

  public save = async () => {
    if (!this._model) {
      throw new Error("[M3UFile.save]: M3U JSON is empty");
    }

    // TODO: Fix the root problem and remove this filter
    const u = new Set();
    const toSave = this._model.channels.filter((c) => {
      if (u.has(c.id)) {
        return false;
      }
      u.add(c.id);
      return true;
    });

    Logger.info("[M3UFile.save]: Saving M3U channel files");
    await M3UChannelModel.bulkSave(toSave);

    Logger.info("[M3UFile.save]: Saving M3U file");
    await this._model.save();

    return true;
  };

  public toString = () => {
    if (!this._model) {
      throw new Error("[M3UFile.toString]: M3U JSON is empty");
    }

    return [
      "#EXTM3U ",
      ...this._model.channels.map((d) => {
        return [
          `#EXTINF: -1 group-title="${d.group}" tvg-id="${d.tvgId}" tvg-logo="${d.logo}", ${d.name}`,
          d.url,
        ].join("\n");
      }),
    ].join("\n");
  };

  private getM3U = async (
    uniqueOnly: boolean,
    refresh?: boolean,
  ): Promise<M3U.BaseDocument> => {
    try {
      if (refresh) {
        Logger.info("[M3UFile.getM3U]: Forcing refresh");
        return this.createM3U(uniqueOnly);
      }

      const model = await M3UModel
        .findOne({}, {}, { sort: { date: -1 } })
        .populate("channels");
      
      if (!model) {
        Logger.info("[M3UFile.getM3U]: No M3U entry found");
        return this.createM3U(uniqueOnly);
      }

      if (this.checkExpired(model)) {
        Logger.info("[M3UFile.getM3U]: M3U entry expired");
        return this.createM3U(uniqueOnly);
      }

      Logger.info(
        `[IPTVOrgCode.getCodes]: Found ${model.channels.length} M3U channels `
      );

      return model;
    } catch (error) {
      Logger.err(error);
      throw error;
    }
  };

  private createM3U = async (
    uniqueOnly: boolean
  ): Promise<M3U.BaseDocument> => {
    const m3uFileString = await this.getJson();
    const m3uFileJson = parseJson(m3uFileString);

    const channels = uniqueOnly
      ? filterRegion(filterUnique(m3uFileJson))
      : m3uFileJson;

    const channelDocuments = await M3UChannelModel.find({
      url: channels.map((channel) => channel.url),
    });
    
    const confirmedMappings = await this.getConfirmedMatches();

    this._expired = false;
   
    return new M3UModel({
      channels: channels.map((channel) => {
        return (
          channelDocuments.find((c) => c.url === channel.url) ||
          new M3UChannelModel(
            confirmedMappings[channel.url] || {
              ...channel,
              ...this.getMatch(channel),
            }
          )
        );
      }),
    });
  };

  // TODO: replace function using Mongo
  private getConfirmedMatches = async (): Promise<M3U.ChannelInfoMapping> => {
    try {
      const mappingsFileString = await getJson(CONFIRMED_MAPPINGS_FILE);
      const mappings = JSON.parse(mappingsFileString) as M3U.ChannelInfoMapping;

      return mappings;
    } catch (_) {
      Logger.warn(
        "[M3UFile.getConfirmedMatches]: Custom Mappings JSON is empty"
      );
      return {};
    }
  };

  private getMatch = (channel: M3U.ChannelInfoModel) => {    
    if (!this._matcher) {
      Logger.info("[M3UFile.getMatch]: No matcher set");
      return {};
    }

    const id = [channel.tvgId, ...(channel.parsedIds || [])].filter(
      (c) => c
    ) as string[];

    const match = this._matcher.match({
      name: [channel.name, channel.parsedName],
      id,
      formatted: true,
    }) as XMLTV.CodeMatch[];

    if (match[0]?.code) {
      return match[0].code;
    }

    return {};
  };

  private getJson = async (): Promise<string> => {
    try {
      if (process.env.M3U_STATIC_DATA_FILE) {
        return await getJson(process.env.M3U_STATIC_DATA_FILE);
      }

      return await getFromUrl(M3U_URL);
    } catch (error) {
      try {
        return await getJson(M3U_FILENAME);
      } catch (error) {
        Logger.err(error);
        throw error;
      }
    }
  };
}

export default M3UFile;
