import {
  getFromUrl,
  getJson,
  parseChannelName,
  parseCountryFromChannelName,
  parseIdFromChannelName,
  saveJson,
} from "@shared/functions";
import M3UModel, { M3UChannelModel } from "@objects/database/M3USchema";
import MongoConnector from "@objects/database/Mongo";
import Logger from "@shared/Logger";

const M3U_URL = process.env.M3U_URL as string;
const GENERATED_MAPPINGS_FILE = process.env.GENERATED_MAPPINGS_FILE as string;
const CONFIRMED_MAPPINGS_FILE = process.env.CONFIRMED_MAPPINGS_FILE as string;
const M3U_INFO_REGEX =
  /^#EXTINF:.?(?<extInf>\d) *group-title="(?<group>.*?)" *tvg-id="(?<id>.*?)" *tvg-logo="(?<logo>.*?)" *,(?<name>.*)/;
const CHANNEL_MATCHING_REGEX =
  /^((.*?:( *)?)|([A-Z]{2} ?\((?<region>.*?)\) )?)?((?<nameCode>[A-Z]{4}) TV)?(?<name>.*?)( *)?(?<definition>F?HD)?$/i;

class M3UFile {
  private _loaded = false;
  private _model?: M3U.BaseDocument;
  private _mappings?: M3U.CustomMappings;

  public load = async (refresh = false, uniqueOnly = true) => {
    if (this._model && !refresh) {
      return;
    }

    if (!MongoConnector.connected) {
      await MongoConnector.connect();
    }

    this._model = await this.getM3U(uniqueOnly, refresh);

    this._mappings = await this.getMappings();

    this._loaded = true;

    return this._model;
  };

  // TODO: Remove mutations to channels
  public insertCodeInfo = async (codes: {
    [tvgId: string]: EPG.Code | M3U.CustomMapping;
  }) => {
    if (!this._model) {
      throw new Error("[M3UFile]: M3U JSON is empty");
    }

    const ids = this._model?.m3u.reduce<M3U.CustomMappings>((acc, channel) => {
      const channelJson = channel.toJSON();

      if (!channelJson.url) {
        return acc;
      }

      const code = codes[channelJson.url] as EPG.Code & M3U.CustomMapping;

      if (!code) {
        acc[channelJson.url] = {
          ...channelJson,
          confirmed: false,
          id: null,
          logo: null,
          country: "unpoplated",
        };

        return acc;
      }

      if (code.tvg_id) {
        const append = {
          id: code.tvg_id,
          name: code.display_name,
          logo: channelJson.logo || code.logo,
          country: channelJson.country || code.country,
        };

        channel.set({
          ...append,
        });

        acc[channelJson.url] = {
          ...channelJson,
          ...append,
          confirmed: false,
        };
      } else {
        const append = {
          id: code.id || "",
          name: code.name || channelJson.name,
          logo: code.logo || channelJson.logo,
          country: code.country || channelJson.country,
        };

        channel.set({
          ...append,
        });

        acc[channelJson.url] = {
          ...channelJson,
          ...append,
          confirmed: code.confirmed,
        };
      }

      return acc;
    }, {});

    saveJson(GENERATED_MAPPINGS_FILE, ids);
  };

  public customMap = (channel: M3U.ChannelInfoDocument) => {
    if (!this._mappings || !channel.url) {
      return null;
    }

    return this._mappings[channel.url];
  };

  public get channels(): M3U.ChannelInfoDocument[] {
    if (!this.isLoaded) {
      throw new Error("[M3UFile]: M3U JSON is not loaded");
    }

    return this._model?.m3u || [];
  }

  public get isLoaded() {
    return this._loaded;
  }

  public getChannelJSON = (filters: M3U.ChannelInfoFilters) => {
    return this._model?.m3u.filter((channel) => {
      return Object.entries(filters)
        .filter(([_, value]) => value)
        .every(([filter, value]) => {
          const regex = new RegExp(`^.*?(${value}).*$`, "gi");

          // @ts-ignore
          return regex.test(channel[filter]);
        });
    });
  };

  public toString = async () => {
    if (!this._model) {
      throw new Error("[M3UFile]: M3U JSON is empty");
    }

    await Promise.all(this._model.m3u.map((channel) => channel.save()));
    await this._model.save();

    return [
      "#EXTM3U ",
      ...this._model.m3u.map((d) => {
        return [
          `#EXTINF: -1 group-title="${d.group}" tvg-id="${d.id}" tvg-logo="${d.logo}", ${d.name}`,
          d.url,
        ].join("\n");
      }),
    ].join("\n");
  };

  private filterUnique = (channels: M3U.ChannelInfo[]) => {
    const channelDictionary = channels.reduce<{
      [key: string]: { [key: string]: M3U.ChannelInfo };
    }>((acc, channel) => {
      const matches = channel.name.match(
        CHANNEL_MATCHING_REGEX
      ) as M3U.NameChannelInfoMatch;

      const info = matches?.groups;

      if (info?.name) {
        if (!acc[info.name]) {
          acc[info.name] = {};
        }

        acc[info.name][info.definition || "SD"] = {
          ...channel,
          ...info,
        };
      }

      return acc;
    }, {});

    return Object.values(channelDictionary).map(
      (list) => list["FHD"] || list["HD"] || list["SD"]
    );
  };

  private filterRegion = (channels: M3U.ChannelInfo[]) => {
    return channels.filter((channel) => !channel.region);
  };

  private parseJson = (m3u: string) => {
    const split = m3u.split("\n");

    const json = split.reduce<M3U.ChannelInfo[]>((acc, line) => {
      if (acc.length > 0 && line[0] && line[0] !== "#") {
        const entry = acc.pop() as M3U.ChannelInfo;
        entry.url = line;
        acc.push(entry);
        return acc;
      }

      const matches = line.match(M3U_INFO_REGEX);

      if (!matches?.groups) return acc;

      const { group, id, logo, name, nameCode } = matches.groups;

      acc.push({
        group,
        id,
        logo,
        name,
        country: parseCountryFromChannelName(name),
        originalName: name || line,
        parsedName: parseChannelName(name),
        parsedIds: [nameCode]
          .concat(parseIdFromChannelName(name) || [])
          .filter((n) => n),
        url: "",
      });

      return acc;
    }, []);

    return json;
  };

  private getMappings = async () => {
    try {
      const mappingsFile = await getJson(CONFIRMED_MAPPINGS_FILE);
      const json = JSON.parse(mappingsFile) as M3U.CustomMappings;

      return json;
    } catch (err) {
      Logger.info("[M3UFile.getMappings]: Custom Mappings JSON is empty");
      return {};
    }
  };

  private getM3U = async (
    uniqueOnly: boolean,
    refresh = false
  ): Promise<M3U.BaseDocument> => {
    try {
      if (refresh) {
        Logger.info("[M3UFile.getM3U]: Forcing refresh");
        throw new Error();
      }

      const m3u = await M3UModel.findOne().sort({ date: 1 }).populate("m3u");

      if (!m3u) {
        Logger.info("[M3UFile.getM3U]: No M3U entry found");
        throw new Error();
      }

      return m3u;
    } catch (error) {
      Logger.info("[M3UFile.getM3U]: No M3U entry found");
      const json = await this.getJson();

      if (uniqueOnly) {
        json.m3u = this.filterRegion(this.filterUnique(json.m3u));
      }

      const channels = await M3UChannelModel.find({
        url: json.m3u.map((channel) => channel.url),
      });

      const m3u = new M3UModel({
        ...json,
        m3u: json.m3u.map((channel) => {
          return (
            channels.find((c) => c.url === channel.url) ||
            new M3UChannelModel(channel)
          );
        }),
      });

      return m3u;
    }
  };

  private getJson = async (): Promise<M3U.Base> => {
    const fileJson = await getFromUrl(M3U_URL);

    const json = {
      date: new Date(),
      m3u: this.parseJson(fileJson),
    };

    return json;
  };
}

export default M3UFile;
