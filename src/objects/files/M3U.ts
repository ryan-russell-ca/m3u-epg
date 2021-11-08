import {
  getFromUrl,
  getJson,
  parseJson,
  filterUnique,
  filterRegion,
} from '@shared/functions';
import M3UModel, { M3UChannelModel } from '@objects/database/M3USchema';
import MongoConnector from '@objects/database/Mongo';
import Logger from '@shared/Logger';
import BaseFile from './BaseFile';

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

class M3U extends BaseFile<M3U.BaseDocument> {
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

  public get channels(): M3U.ChannelInfoModel[] {
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

  public getChannelJSON = (filters: M3U.ChannelInfoFilters) => {
    return this.model?.channels.filter((channel) => {
      return Object.entries(filters)
        .filter(([_, value]: [string, string]) => value)
        .every(([filter, value]: [string, string]) => {
          const regex = new RegExp(`^.*?(${value}).*$`, 'gi');
          return regex.test((channel as unknown as Record<string, string>)[filter]);
        });
    });
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
      ...this.model.channels.map((d) => {
        return [
          `#EXTINF: -1 group-title="${d.group}" tvg-id="${d.tvgId}" tvg-logo="${d.logo}", ${d.name}`,
          d.url,
        ].join('\n');
      }),
    ].join('\n');
  };

  private getM3U = async (
    uniqueOnly: boolean,
    refresh?: boolean
  ): Promise<M3U.BaseDocument> => {
    try {
      if (refresh) {
        Logger.info('[M3U.getM3U]: Forcing refresh');
        return this.createM3U(uniqueOnly);
      }

      const model = await M3UModel.findOne(
        {},
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
        `[IPTVOrgCode.getCodes]: Found ${model.channels.length} M3U channels `
      );

      return model;
    } catch (error) {
      Logger.err(error);
      throw error;
    }
  };

  private insertChannels = async (channels: M3U.ChannelInfoModel[]) => {
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
          },
        },
        upsert: true,
      },
    }));

    Logger.info('[M3U.save]: Saving M3U channel files');

    const { insertedIds, upsertedIds } = await M3UChannelModel.bulkWrite(operations);

    return [
      ...Object.values(insertedIds),
      ...Object.values(upsertedIds),
    ];
  };

  public save = async () => {
    if (!this.model) {
      throw new Error('[M3U.save]: M3U JSON is empty');
    }

    Logger.info('[M3U.save]: Saving M3U file');
    await this.model.save();

    return true;
  };

  private createM3U = async (
    uniqueOnly: boolean
  ): Promise<M3U.BaseDocument> => {
    Logger.info('[M3U.createM3U]: Creating M3U playlist...');

    const m3uFileString = await this.getJson();
    const m3uFileJson = parseJson(m3uFileString);

    const filtered = uniqueOnly
      ? filterRegion(filterUnique(m3uFileJson))
      : m3uFileJson;

    const confirmedMappings = await this.getConfirmedMatches();

    this._expired = false;

    const channels = filtered.map((channel) => {
      const attributes = confirmedMappings[channel.url] || {
        ...channel,
        ...this.getMatch(channel),
      };

      return {
        group: attributes.group,
        name: attributes.name,
        originalName: attributes.originalName,
        country: attributes.country,
        url: attributes.url,
        parsedName: attributes.parsedName,
        parsedIds: attributes.parsedIds,
        logo: attributes.logo,
        tvgId: attributes.tvgId,
        definition: attributes.definition,
        confirmed: attributes.confirmed,
      };
    });

    const ids = await this.insertChannels(channels);

    return (await M3UModel.create({
      channels: ids,
    })).populate('channels');
  };

  // TODO: replace function using Mongo
  private getConfirmedMatches = async (): Promise<M3U.ChannelInfoMapping> => {
    try {
      const mappingsFileString = await getJson(CONFIRMED_MAPPINGS_FILE);
      const mappings = JSON.parse(mappingsFileString) as M3U.ChannelInfoMapping;

      return mappings;
    } catch (_) {
      Logger.warn('[M3U.getConfirmedMatches]: Custom Mappings JSON is empty');
      return {};
    }
  };

  private getMatch = (channel: M3U.ChannelInfoModel) => {
    if (!this._matcher) {
      Logger.info('[M3U.getMatch]: No matcher set');
      return {};
    }

    const id = [channel.tvgId, ...(channel.parsedIds || [])].filter(
      (c) => c
    ) as string[];

    const match = this._matcher.match({
      name: [channel.name, channel.parsedName, channel.originalName],
      id,
      formatted: true,
    }) as XMLTV.CodeMatch[];

    if (match[0]?.code) {
      return match[0].code;
    }

    return {};
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
