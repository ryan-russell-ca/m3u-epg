import {
  getFromUrl,
  getJson,
  parseJson,
  filterUnique,
  filterRegion,
  counterLog,
} from '@/api-lib/common/functions';
import {
  PlaylistModel,
  PlaylistChannelCountryModel,
  PlaylistChannelGroupModel,
  PlaylistChannelModel,
} from '@/api-lib/db/playlistSchema';
import MongoConnector from '@/api-lib/db/mongo';
import Logger from '@/api-lib/modules/Logger';
import BaseFile from './BaseFile';
import {
  BaseDocument,
  Matcher,
  ChannelInfoModel,
  ChannelInfoFilters,
  ChannelInfoMapping,
  ChannelCountryModel,
  ChannelGroupModel,
} from '@/types/m3u';
import { CodeMatch } from '@/types/xmltv';

const M3U_URL = process.env.M3U_URL as string;
const M3U_FILENAME = process.env.M3U_FILENAME as string;
const CONFIRMED_MAPPINGS_FILE = process.env.CONFIRMED_MAPPINGS_FILE as string;
const M3U_EXPIRATION_MILLI =
  parseInt(process.env.M3U_EXPIRATION_SECONDS as string) * 1000;

export enum Definition {
  FullHighDef = 'FHD',
  HighDef = 'HD',
  StandardDef = 'SD',
  Unknown = 'UNKNOWN',
}

class M3U extends BaseFile<BaseDocument> {
  protected _expirationMilli = M3U_EXPIRATION_MILLI;
  private _matcher?: Matcher;

  public load = async (
    matcher: Matcher,
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

    this._loaded = true;

    return true;
  };

  public get channels(): ChannelInfoModel[] {
    if (!this.isLoaded) {
      throw new Error('[M3U]: M3U JSON is not loaded');
    }

    return this._model?.channels || [];
  }

  public get tvgIds() {
    const tvgIds = this.model?.channels
      .map((channel) => channel.tvgId)
      .filter((c) => c);
    return (tvgIds || []) as string[];
  }

  public getChannelJSON = (filters: ChannelInfoFilters) => {
    return this.model?.channels.filter((channel) => {
      return Object.entries(filters)
        .filter(([, value]: [string, string]) => value)
        .every(([filter, value]: [string, string]) => {
          const regex = new RegExp(`^.*?(${value}).*$`, 'gi');
          return regex.test(
            (channel as unknown as Record<string, string>)[filter]
          );
        });
    });
  };

  public getSingleChannelMatch = async ({
    name,
    id,
  }: {
    name?: string;
    id?: string;
  }) => {
    const channel = await PlaylistChannelModel.findOne({ name, id });

    if (channel) {
      return this.getMatch(channel);
    }

    return null;
  };

  public getChannels = () => {
    return this.model?.channels || [];
  };

  public toString = () => {
    if (!this.model) {
      throw new Error('[M3U.toString]: M3U JSON is empty');
    }

    return [
      '#EXTM3U ',
      ...this.model.channels
        .sort((a: ChannelInfoModel, b: ChannelInfoModel) =>
          a.name.localeCompare(b.name)
        )
        .map((channel: ChannelInfoModel, no: number) => {
          return [
            `#EXTINF: -1 tvg-chno="${no}" group-title="${channel.group}" tvg-id="${channel.tvgId}" tvg-logo="${channel.logo}", ${channel.name}`,
            channel.url,
          ].join('\n');
        }),
    ].join('\n');
  };

  public getMatch = (channel: ChannelInfoModel) => {
    if (!this._matcher) {
      Logger.info('[M3U.getMatch]: No matcher set');
      return {};
    }

    const id = [channel.tvgId, ...(channel.parsedIds || [])].filter(
      (c) => c
    ) as string[];

    const name = [
      channel.name,
      channel.parsedName,
      channel.originalName,
    ].filter((c) => c) as string[];

    const match = this._matcher.match({
      name,
      id,
      formatted: true,
    }) as CodeMatch[];

    if (match[0]?.code) {
      return {
        ...match[0].code,
        confidence: match[0].score,
      };
    }

    return {};
  };

  private getM3U = async (
    uniqueOnly: boolean,
    refresh?: boolean
  ): Promise<BaseDocument> => {
    try {
      if (refresh) {
        Logger.info('[M3U.getM3U]: Forcing refresh');
        return this.createM3U(uniqueOnly);
      }

      const model = await PlaylistModel.findOne(
        { url: M3U_URL },
        {},
        { sort: { date: -1 } }
      ).populate('channels');

      if (!model) {
        Logger.info('[M3U.getM3U]: No M3U entry found');
        return this.createM3U(uniqueOnly);
      }

      if (this.checkExpired(model)) {
        Logger.info('[M3U.getM3U]: M3U entry expired');
        return this.createM3U(uniqueOnly);
      }

      Logger.info(
        `[M3U.getCodes]: Found ${model.channels.length} M3U channels `
      );

      return model;
    } catch (error) {
      Logger.err(error);
      throw error;
    }
  };

  private insertChannels = async (channels: ChannelInfoModel[]) => {
    Logger.info('[M3U.insertChannels]: Mapping M3U channel files');

    try {
      const countries = (await PlaylistChannelCountryModel.find()).reduce<
        Record<string, ChannelCountryModel>
      >((acc, country) => {
        acc[country.shortName] = country;
        return acc;
      }, {});

      const groups = (
        await PlaylistChannelGroupModel.find().select(['_id', 'name'])
      ).reduce<Record<string, ChannelGroupModel>>((acc, group) => {
        acc[group.name] = group;
        return acc;
      }, {});

      const operations = await Promise.all(
        channels.map(async (ch) => {
          return {
            updateOne: {
              filter: { url: ch.url },
              update: {
                $set: {
                  group: groups[ch.group || ''],
                  name: ch.name,
                  originalName: ch.originalName,
                  country: countries[ch.country || ''],
                  url: ch.url,
                  parsedName: ch.parsedName,
                  parsedIds: ch.parsedIds,
                  logo: ch.logo,
                  tvgId: ch.tvgId,
                  definition: ch.definition,
                  confirmed: ch.confirmed,
                  confidence: ch.confidence,
                },
              },
              upsert: true,
            },
          };
        })
      );

      Logger.info('[M3U.insertChannels]: Saving M3U channel files');

      await PlaylistChannelModel.bulkWrite(operations);

      return await PlaylistChannelModel.find({
        url: channels.map(({ url }) => url),
      });
    } catch (err) {
      Logger.err(err);
    }
  };

  private createM3U = async (uniqueOnly: boolean): Promise<BaseDocument> => {
    Logger.info('[M3U.createM3U]: Creating M3U playlist...');

    const playlistFileString = await this.getJson();
    const playlistFileJson = parseJson(playlistFileString);

    const filtered = uniqueOnly
      ? filterRegion(filterUnique(playlistFileJson))
      : playlistFileJson;

    Logger.info('[M3U.createM3U]: Matching confirmed channels...');

    const confirmedMappings = await this.getConfirmedMatches();

    this._expired = false;

    Logger.info(`[M3U.createM3U]: Matching channels starting...`);

    const channelModelUrls = (await PlaylistChannelModel.find({
      url: filtered.map(({ url }) => url),
    })).map((ch: ChannelInfoModel) => ch.url);

    const numChannels = filtered.length;

    const channels = filtered
      .filter(({ url }) => !channelModelUrls.includes(url))
      .map((channel: ChannelInfoModel, i: number) => {
        counterLog(`[M3U.createM3U]: Matching channel ${i + 1}/${numChannels}`);

        const attributes = (confirmedMappings[channel.url] || {
          ...channel,
          ...this.getMatch(channel),
        }) as ChannelInfoModel & { displayName: string };

        return {
          group: attributes.group,
          name: attributes.displayName || attributes.name,
          originalName: attributes.originalName,
          country: attributes.country,
          url: attributes.url || 'no_url',
          parsedName: attributes.parsedName,
          parsedIds: attributes.parsedIds,
          logo: attributes.logo,
          tvgId: attributes.tvgId,
          definition: attributes.definition,
          confirmed: attributes.confirmed,
          confidence: attributes.confidence,
        };
      });

    await this.insertChannels(channels);

    return (
      await PlaylistModel.create({
        url: M3U_URL,
        channels: await PlaylistChannelModel.find({
          url: filtered.map(({ url }) => url),
        }),
      })
    ).populate('channels');
  };

  // TODO: replace function using Mongo
  private getConfirmedMatches = async (): Promise<ChannelInfoMapping> => {
    try {
      const mappingsFileString = await getJson(CONFIRMED_MAPPINGS_FILE);
      const mappings = JSON.parse(mappingsFileString) as ChannelInfoMapping;

      return mappings;
    } catch (_) {
      Logger.warn('[M3U.getConfirmedMatches]: Custom Mappings JSON is empty');
      return {};
    }
  };

  private getJson = async (): Promise<string> => {
    Logger.info('[M3U.getJson]: Downloading playlist...');

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

export default M3U;
