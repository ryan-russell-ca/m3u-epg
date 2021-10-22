import {
  getFromUrl,
  getJson,
  parseJson,
  filterUnique,
  filterRegion,
} from '@/common/functions';
import M3UModel, { M3UChannelModel } from '@/shared/database/M3USchema';
import MongoConnector from '@/shared/database/Mongo';
import Logger from '@/shared/modules/Logger';
import BaseFile from './BaseFile';
import readline from 'readline';
import {
  BaseDocument,
  Matcher,
  ChannelInfoModel,
  ChannelInfoFilters,
  ChannelInfoMapping,
} from '@/shared/@types/m3u';

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

    this._model = await this.getM3U(uniqueOnly, refresh);

    await this.save();

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
    const channel = await M3UChannelModel.findOne({ name, id });

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
      throw new Error('[toString]: M3U JSON is empty');
    }

    return [
      '#EXTM3U ',
      ...this.model.channels
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((channel, no) => {
          return [
            `#EXTINF: -1 tvg-chno="${no}" group-title="${channel.group}" tvg-id="${channel.tvgId}" tvg-logo="${channel.logo}", ${channel.name}`,
            channel.url,
          ].join('\n');
        }),
    ].join('\n');
  };

  public getMatch = (channel: ChannelInfoModel) => {
    if (!this._matcher) {
      Logger.info('[getMatch]: No matcher set');
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
        Logger.info('[getM3U]: Forcing refresh');
        return this.createM3U(uniqueOnly);
      }

      const model = await M3UModel.findOne(
        {},
        {},
        { sort: { date: -1 } }
      ).populate('channels');

      if (!model) {
        Logger.info('[getM3U]: No M3U entry found');
        return this.createM3U(uniqueOnly);
      }

      if (this.checkExpired(model)) {
        Logger.info('[getM3U]: M3U entry expired');
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

  private insertChannels = async (channels: ChannelInfoModel[]) => {
    Logger.info('[insertChannels]: Mapping M3U channel files');

    const operations = channels.map((ch) => ({
      updateOne: {
        filter: { url: ch.url },
        update: {
          $set: {
            group: ch.group,
            name: ch.name,
            originalName: ch.originalName,
            country: ch.country,
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
    }));

    Logger.info('[insertChannels]: Saving M3U channel files');

    return await M3UChannelModel.bulkWrite(operations);
  };

  private save = async () => {
    if (!this.model) {
      throw new Error('[save]: M3U JSON is empty');
    }

    Logger.info('[save]: Saving M3U file');
    await this.model.save();

    return true;
  };

  private createM3U = async (uniqueOnly: boolean): Promise<BaseDocument> => {
    Logger.info('[createM3U]: Creating M3U playlist...');

    const m3uFileString = await this.getJson();
    const m3uFileJson = parseJson(m3uFileString);

    const filtered = uniqueOnly
      ? filterRegion(filterUnique(m3uFileJson))
      : m3uFileJson;

    Logger.info('[createM3U]: Matching confirmed channels...');

    const confirmedMappings = await this.getConfirmedMatches();

    this._expired = false;

    Logger.info(`[createM3U]: Matching channels starting...`);

    const channelModels = await M3UChannelModel.find({
      url: filtered.map(({ url }) => url),
    })
    
    const channelModelUrls = channelModels.map((ch: ChannelInfoModel) => ch.url);
    
    const numChannels = filtered.length;
    const channels = filtered
      .filter(({ url }) => !channelModelUrls.includes(url))
      .map((channel, i) => {
        readline.moveCursor(process.stdout, 0, -1);
        readline.clearLine(process.stdout, 1);
        Logger.info(`[createM3U]: Matching channel ${i + 1}/${numChannels}`);

        const attributes = (confirmedMappings[channel.url] || {
          ...channel,
          ...this.getMatch(channel),
        }) as ChannelInfoModel & { displayName: string };

        return {
          group: attributes.group,
          name: attributes.displayName || attributes.name,
          originalName: attributes.originalName,
          country: attributes.country,
          url: attributes.url,
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
      await M3UModel.create({
        channels: await M3UChannelModel.find({ url: channels.map(({ url }) => url) }),
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
      Logger.warn('[getConfirmedMatches]: Custom Mappings JSON is empty');
      return {};
    }
  };

  private getJson = async (): Promise<string> => {
    Logger.info('[getJson]: Downloading playlist...');

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
