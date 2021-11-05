import {
  getFromUrl,
  getJson,
  parseChannelName,
  parseCountryFromChannelName,
  parseIdFromChannelName,
} from "@shared/functions";
import M3UModel, { M3UChannelModel } from "@objects/database/M3USchema";
import MongoConnector from "@objects/database/Mongo";
import Logger from "@shared/Logger";
import { Schema } from "mongoose";

const M3U_URL = process.env.M3U_URL as string;
const M3U_FILENAME = process.env.M3U_FILENAME as string;
const CONFIRMED_MAPPINGS_FILE = process.env.CONFIRMED_MAPPINGS_FILE as string;
const M3U_INFO_REGEX =
  /^#EXTINF:.?(?<extInf>\d) *group-title="(?<group>.*?)" *tvg-id="(?<tvgId>.*?)" *tvg-logo="(?<logo>.*?)" *,(?<name>.*)/;
const CHANNEL_MATCHING_REGEX =
  /^((.*?:( *)?)|([A-Z]{2} ?\((?<region>.*?)\) )?)?((?<nameCode>[A-Z]{4}) TV)?(?<name>.*?)( *)?(?<definition>F?HD)?$/i;

export enum Definition {
  FullHighDef = "FHD",
  HighDef = "HD",
  StandardDef = "SD",
  Unknown = "UNKNOWN",
}

class M3UFile {
  private _loaded = false;
  private _model?: M3U.BaseDocument;
  private _matcher?: M3U.Matcher;

  public load = async (
    matcher: M3U.Matcher,
    refresh = false,
    uniqueOnly = true
  ) => {
    if (this._model && !refresh) {
      return;
    }

    this._matcher = matcher;

    if (!MongoConnector.connected) {
      await MongoConnector.connect();
    }

    this._model = await this.getM3U(uniqueOnly, refresh);
    console.log(this._model);
    
    this._loaded = true;

    return this._model;
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

  public get isLoaded() {
    return this._loaded;
  }

  public get tvgIds() {
    return this._model?.channels.map((channel) => channel.tvgId) || [];
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

  private filterUnique = (channels: M3U.ChannelInfoModel[]) => {
    const channelDictionary = channels.reduce<
      Record<string, Record<string, M3U.ChannelInfoModel>>
    >((acc, channel) => {
      const matches = channel.name.match(
        CHANNEL_MATCHING_REGEX
      ) as M3U.NameChannelInfoMatch;

      const info = matches?.groups;

      if (info?.name) {
        if (!acc[info.name]) {
          acc[info.name] = {};
        }

        acc[info.name][info.definition || Definition.Unknown] = {
          ...channel,
          ...info,
        };
      }

      return acc;
    }, {});

    return Object.values(channelDictionary).map(
      (list) =>
        list[Definition.FullHighDef] ||
        list[Definition.HighDef] ||
        list[Definition.StandardDef] ||
        list[Definition.Unknown]
    );
  };

  private filterRegion = (channels: M3U.ChannelInfoModel[]) => {
    return channels.filter((channel) => !channel.region);
  };

  private parseJson = (m3uFileString: string) => {
    const split = m3uFileString.split("\n");

    const channels = split.reduce<M3U.ChannelInfoModel[]>((acc, line) => {
      if (acc.length > 0 && line[0] && line[0] !== "#") {
        acc[acc.length - 1].url = line;
        return acc;
      }

      const matches = line.match(M3U_INFO_REGEX);

      if (!matches?.groups) return acc;

      const { group, tvgId, logo, name, nameCode } = matches.groups;

      acc.push({
        group,
        tvgId,
        logo,
        name,
        country: parseCountryFromChannelName(name),
        originalName: name || line,
        parsedName: parseChannelName(name),
        parsedIds: [nameCode, ...parseIdFromChannelName(name)].filter((n) => n),
        url: "",
        confirmed: false,
      });

      return acc;
    }, []);
    
    return channels;
  };

  private getM3U = async (
    uniqueOnly: boolean,
    refresh = false
  ): Promise<M3U.BaseDocument> => {
    try {
      if (refresh) {
        Logger.info("[M3UFile.getM3U]: Forcing refresh");
      }

      const base = await M3UModel.findOne()
        .sort({ date: 1 })
        .populate("channels");

      if (!base) {
        Logger.info("[M3UFile.getM3U]: No M3U entry found");
        return this.createM3U(uniqueOnly);
      }

      return base;
    } catch (error) {
      Logger.err(error);
      throw error;
    }
  };

  private createM3U = async (
    uniqueOnly: boolean
  ): Promise<M3U.BaseDocument> => {
    const channels = await this.getJson(uniqueOnly);

    const channelDocuments = await M3UChannelModel.find({
      url: channels.map((channel) => channel.url),
    });

    const confirmedMappings = await this.getConfirmedMatches();

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

    const match = this._matcher.match({
      name: [channel.name, channel.parsedName],
      id: [channel.tvgId, ...(channel.parsedIds || [])],
      formatted: true,
    }) as XMLTV.CodeMatch[];

    if (match[0]?.code) {
      return match[0].code;
    }

    return {};
  };

  private getJson = async (
    uniqueOnly: boolean
  ): Promise<M3U.ChannelInfoModel[]> => {
    try {
      const m3uFileString = await getFromUrl(M3U_URL);
      const channels = this.parseJson(m3uFileString);

      if (uniqueOnly) {
        return this.filterRegion(this.filterUnique(channels));
      }

      return channels;
    } catch (error) {
      try {
        const m3uFileString = await getJson(M3U_FILENAME);
        const channels = this.parseJson(m3uFileString);

        if (uniqueOnly) {
          return this.filterRegion(this.filterUnique(channels));
        }

        return channels;
      } catch (error) {
        Logger.err(error);
        throw error;
      }
    }
  };
}

export default M3UFile;
