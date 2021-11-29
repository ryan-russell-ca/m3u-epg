import xmlParser from 'fast-xml-parser';
import { filterProgrammeByDate, getFromUrl, getJson } from '@/common/functions';
import Logger from '@/shared/modules/Logger';
import {
  XMLTVChannelModel,
  XMLTVModel,
  XMLTVProgrammeModel,
} from '@/shared/database/XMLTVSchema';
import MongoConnector from '@/shared/database/Mongo';
import BaseFile from './BaseFile';
import { BaseDocument, ChannelModel, ProgrammeModel } from '@/shared/@types/xmltv';

const XMLTV_EXPIRATION_MILLI =
  parseInt(process.env.XMLTV_EXPIRATION_SECONDS as string) * 1000;

class XMLTV extends BaseFile<BaseDocument> {
  protected _expirationMilli = XMLTV_EXPIRATION_MILLI;
  private _valid = false;
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
    super();
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

    const json = JSON.parse(xmlTvModel) as Base;

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

    this._loaded = true;

    return true;
  };

  public getByTvgId = (
    tvgId: string
  ): {
    channel: ChannelModel;
    programme: ProgrammeModel[];
  } | null => {
    try {
      if (!this._model) {
        throw new Error('[getByCode]: XMLTV is empty');
      }

      const channel = this._model.xmlTv.channel.find(
        (channel) => channel['@_id'] === tvgId
      );

      const programme = this._model.xmlTv.programme.filter(
        (programme) => programme['@_channel'] === tvgId
      );

      return channel
        ? {
            channel: {
              '@_id': channel['@_id'],
              'display-name': channel['display-name'],
              icon: channel.icon,
            },
            programme: programme.map((p) => ({
              '@_start': p['@_start'],
              '@_stop': p['@_stop'],
              '@_channel': p['@_channel'],
              title: p.title,
            })),
          }
        : null;
    } catch (error) {
      Logger.info(`[getByCode]: '${tvgId}' not found`);
      return null;
    }
  };

  public getChannel = (): ChannelModel[] => {
    if (!this._model) {
      throw new Error('[getChannel]: XMLTV JSON is empty');
    }

    return this._model.xmlTv.channel.map((c) => ({
      '@_id': c['@_id'],
      'display-name': c['display-name'],
      icon: c.icon,
    }));
  };

  public getProgramme = (): ProgrammeModel[] => {
    if (!this._model) {
      throw new Error('[getProgramme]: XMLTV JSON is empty');
    }

    return this._model.xmlTv.programme.map((p) => ({
      '@_start': p['@_start'],
      '@_stop': p['@_stop'],
      '@_channel': p['@_channel'],
      title: p.title,
    }));
  };

  public get url() {
    return this._url;
  }

  public get isValid() {
    return this._valid;
  }

  private loadFromJSON = async (base: Base) => {
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
        Logger.info('[getXMLTV]: Forcing refresh...');
        return this.createXmlTv(url, filterIds);
      }

      const model = await XMLTVModel.findOne(
        { url },
        {},
        { sort: { date: -1 } }
      )
        .populate('xmlTv.channel')
        .populate('xmlTv.programme');

      if (!model) {
        Logger.info('[getXMLTV]: No XMLTV entry found');
        return this.createXmlTv(url, filterIds);
      }

      if (this.checkExpired(model)) {
        Logger.info('[getXMLTV]: XMLTV entry expired');
        return this.createXmlTv(url, filterIds);
      }

      Logger.info(
        `[getXMLTV]: Found ${model.xmlTv.channel.length} XMLTV channels and ${model.xmlTv.programme.length} programmes`
      );

      if (!model?.xmlTv.channel || !model?.xmlTv.programme) {
        Logger.info(`[getXMLTV]: Invalid XMLTV | ${this._url}`);
        throw new Error();
      }

      this._valid = true;

      return model;
    } catch (error) {
      Logger.err(error);
      throw error;
    }
  };

  private filterProgammesByTime = (programmes: ProgrammeModel[]) => {
    const filteredProgrammes = programmes.filter(filterProgrammeByDate);

    if (!filteredProgrammes.length) {
      Logger.info(
        `[filterProgammesByTime]: ${this._url} has not entries within date range`
      );
    }

    return filteredProgrammes;
  };

  private filterModelIds = (
    channels: ChannelModel[],
    programmes: ProgrammeModel[],
    filterIds: string[]
  ) => {    
    return {
      channel: channels.filter((channel) =>
        filterIds.includes(channel['@_id'])
      ),
      programme: programmes.filter((programme) =>
        filterIds.includes(programme['@_channel'])
      ),
    };
  };

  public save = async () => {
    if (this._url === 'custom') {
      Logger.info('[save]: Skipping save XMLTV custom channel files');
      return true;
    }

    if (!this.model) {
      throw new Error('[save]: XMLTV JSON is empty');
    }

    Logger.info('[save]: Saving XMLTV file');
    await this.model.save();

    return true;
  };

  private saveChannels = async (channels: ChannelModel[]) => {
    const operations = channels.map((ch) => ({
      updateOne: {
        filter: { '@_id': ch['@_id'] },
        update: {
          $set: {
            '@_id': ch['@_id'],
            'display-name': ch['display-name'],
            icon: ch.icon,
          },
        },
        upsert: true,
      },
    }));

    Logger.info('[save]: Saving XMLTV channel files');

    const { insertedIds, upsertedIds } = await XMLTVChannelModel.bulkWrite(
      operations
    );

    return [...Object.values(insertedIds), ...Object.values(upsertedIds)];
  };

  private saveProgrammes = async (programmes: ProgrammeModel[]) => {
    const operations = programmes.map((pr) => ({
      updateOne: {
        filter: { '@_channel': pr['@_channel'], '@_start': pr['@_start'] },
        update: {
          $set: {
            '@_start': pr['@_start'],
            '@_stop': pr['@_stop'],
            '@_channel': pr['@_channel'],
            title: pr.title,
            desc: pr.desc,
            category: pr.category,
          },
        },
        upsert: true,
      },
    }));

    Logger.info('[save]: Saving XMLTV programme files');

    const { insertedIds, upsertedIds } = await XMLTVProgrammeModel.bulkWrite(
      operations
    );

    return [...Object.values(insertedIds), ...Object.values(upsertedIds)];
  };

  private populateModels = async (
    model: Base
  ): Promise<BaseDocument> => {
    const channelIds = await this.saveChannels(model.xmlTv.channel);
    const programmeIds = await this.saveProgrammes(model.xmlTv.programme);

    const xmlTv =
      (await XMLTVModel.findOne(
        { url: model.url },
        {},
        { sort: { date: -1 } }
      )) || new XMLTVModel({ url: model.url });

    xmlTv.set({
      date: Date.now(),
      xmlTv: {
        channel: channelIds,
        programme: programmeIds,
      },
    });

    await xmlTv.save();
    await xmlTv.populate(['xmlTv.channel', 'xmlTv.programme']);

    return xmlTv;
  };

  private createXmlTv = async (
    url: string,
    filterIds?: string[]
  ): Promise<Promise<BaseDocument>> => {
    Logger.info('[createXmlTv]: Creating ..');

    const xml = await this.getJson(url);

    const validation = xmlParser.validate(xml);

    if (validation === true) {
      const json = xmlParser.parse(xml, this._parseOptions).tv;

      const { channel, programme } = filterIds
        ? this.filterModelIds(json.channel || [], json.programme || [], filterIds)
        : json;

      const filteredChannel = (channel as ChannelModel[]).filter(
        (c, i, channels) =>
          i === channels.findIndex((cc) => cc['@_id'] === c['@_id'])
      );

      const filteredProgramme = this.filterProgammesByTime(
        (programme as ProgrammeModel[]).filter(
          (p, i, programmes) =>
            i ===
            programmes.findIndex(
              (pp) =>
                pp['@_channel'] === p['@_channel'] &&
                pp['@_start'] === p['@_start']
            )
        )
      );

      this._expired = false;
      this._valid = true;

      return await this.populateModels({
        url: url,
        xmlTv: {
          channel: filteredChannel,
          programme: filteredProgramme,
        },
      });
    }

    throw validation;
  };

  private getJson = async (url: string) => {
    Logger.info(`[getJson]: Downloading XML from ${url}...`);

    if (process.env.XMLTV_STATIC_DATA_FILE) {
      return await getJson(process.env.XMLTV_STATIC_DATA_FILE);
    }

    return await getFromUrl(url);
  };
}

export default XMLTV;
