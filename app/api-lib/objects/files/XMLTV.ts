import { XMLParser, XMLValidator } from 'fast-xml-parser';
import {
  document2Xml,
  filterProgrammeByDate,
  getFromUrl,
  getJson,
  mapChannel,
  mapProgramme,
  parseXmlDate,
  xmlDateToDate,
} from '@/api-lib/common/functions';
import Logger from '@/api-lib/modules/Logger';
import {
  XMLTVModel,
  XMLTVChannelModel,
  XMLTVProgrammeModel,
} from '@/api-lib/db/xmltvSchema';
import MongoConnector from '@/api-lib/db/mongo';
import BaseFile from './BaseFile';
import {
  Base,
  BaseDocument,
  ChannelModel,
  ProgrammeModel,
} from '@/types/xmltv';

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
    const xmlTv = new XMLTV(name, parseOptions);

    const model = await xmlTv.getXMLTV(name, [], false, true);

    if (model) {
      xmlTv._model = model;
      return xmlTv;
    }

    const json = await getJson(filename);

    const xmlTvModel = JSON.parse(json) as Base;

    await xmlTv.loadFromJSON(xmlTvModel);

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

    if (!this._model) {
      return false;
    }

    this._loaded = true;

    return true;
  };

  public getByTvgId = (
    tvgId: string
  ): {
    channel: ChannelModel;
    programme: ProgrammeModel<Date>[];
  } | null => {
    try {
      if (!this._model) {
        throw new Error('[XMLTV.getByCode]: XMLTV is empty');
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
              desc: p.desc,
              category: p.category,
            })),
          }
        : null;
    } catch (error) {
      Logger.info(`[XMLTV.getByCode]: '${tvgId}' not found`);
      return null;
    }
  };

  public getChannel = (asXml = false): ChannelModel[] => {
    if (!this._model) {
      throw new Error('[XMLTV.getChannel]: XMLTV JSON is empty');
    }

    const channel = this._model.xmlTv.channel.map(mapChannel);

    if (asXml) {
      return document2Xml(channel, 'channel', this._parseOptions);
    }

    return channel;
  };

  public getProgramme = (asXml = false): ProgrammeModel<Date>[] => {
    if (!this._model) {
      throw new Error('[XMLTV.getProgramme]: XMLTV JSON is empty');
    }

    const programme = this._model.xmlTv.programme.map(mapProgramme);

    if (asXml) {
      return document2Xml(programme, 'programme', this._parseOptions);
    }

    return programme;
  };

  public get url() {
    return this._url;
  }

  public get isValid() {
    return this._valid;
  }

  private loadFromJSON = async (base: Base, refresh = false) => {
    if (!refresh) {
      const model = await XMLTVModel.findOne(
        { url: base.url },
        {},
        { sort: { date: -1 } }
      ).populate(['xmlTv.channel', 'xmlTv.programme']);

      if (model) {
        return model;
      }
    }

    if (refresh) {
      Logger.info('[XMLTV.loadFromJSON]: Forcing refresh...');
    }

    const xmlTv = await this.populateModels(base);

    this._loaded = true;
    this._valid = true;
    this._model = xmlTv;

    return xmlTv;
  };

  private getXMLTV = async (
    url: string,
    filterIds?: string[],
    refresh?: boolean,
    skipCreate?: boolean
  ) => {
    try {
      if (refresh) {
        Logger.info('[XMLTV.getXMLTV]: Forcing refresh...');
        return this.createXmlTv(url, filterIds);
      }

      const model = await XMLTVModel.findOne(
        { url },
        {},
        { sort: { date: -1 } }
      ).populate(['xmlTv.channel', 'xmlTv.programme']);

      if (!skipCreate) {
        if (!model) {
          Logger.info('[XMLTV.getXMLTV]: No XMLTV entry found');
          return this.createXmlTv(url, filterIds);
        }

        if (this.checkExpired(model)) {
          Logger.info('[XMLTV.getXMLTV]: XMLTV entry expired');
          return this.createXmlTv(url, filterIds);
        }
      } else {
        if (!model) {
          return null;
        }
      }

      Logger.info(
        `[getXMLTV]: Found ${model.xmlTv.channel.length} XMLTV channels and ${model.xmlTv.programme.length} programmes`
      );

      if (!model?.xmlTv.channel || !model?.xmlTv.programme) {
        Logger.info(`[XMLTV.getXMLTV]: Invalid XMLTV | ${this._url}`);
        throw new Error(`[XMLTV.getXMLTV]: Invalid XMLTV | ${this._url}`);
      }

      this._valid = true;

      return model;
    } catch (error) {
      Logger.err(error);
      throw error;
    }
  };

  private filterProgammesByTime = (programmes: ProgrammeModel<Date>[]) => {
    const filteredProgrammes = programmes.filter(filterProgrammeByDate);

    if (!filteredProgrammes.length) {
      Logger.info(
        `[XMLTV.filterProgammesByTime]: ${this._url} has not entries within date range`
      );
    }

    return filteredProgrammes;
  };

  private filterModelIds = (
    channels: ChannelModel[],
    programmes: ProgrammeModel<Date>[],
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
      Logger.info('[XMLTV.save]: Skipping save XMLTV custom channel files');
      return true;
    }

    if (!this.model) {
      throw new Error('[save]: XMLTV JSON is empty');
    }

    Logger.info('[XMLTV.save]: Saving XMLTV file');
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

    Logger.info('[XMLTV.save]: Saving XMLTV channel files');

    await XMLTVChannelModel.bulkWrite(operations);

    return await XMLTVChannelModel.find({
      '@_id': channels.map((ch) => ch['@_id']),
    }).select('_id');
  };

  private saveProgrammes = async (programmes: ProgrammeModel<string>[]): Promise<ProgrammeModel<Date>[]> => {
    const mappedProgrammes = programmes.map((pr) => {
      const startDate = xmlDateToDate(parseXmlDate(pr['@_start']));
      const stopDate = xmlDateToDate(parseXmlDate(pr['@_stop']));

      return {
        ...pr,
        '@_start': startDate,
        '@_stop': stopDate,
      };
    });

    const operations = mappedProgrammes.map((pr) => {
      return {
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
      };
    });

    Logger.info('[XMLTV.save]: Saving XMLTV programme files');

    await XMLTVProgrammeModel.bulkWrite(operations);

    return await XMLTVProgrammeModel.find({
      $or: mappedProgrammes.map((pr) => ({
        '@_channel': pr['@_channel'],
        '@_start': pr['@_start'],
      })),
    }).select('_id');
  };

  private populateModels = async (model: Base): Promise<BaseDocument> => {
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
  ): Promise<BaseDocument | undefined> => {
    Logger.info('[XMLTV.createXmlTv]: Creating...');

    const xml = await this.getJson(url);

    const validation = XMLValidator.validate(xml);
    const xmlParser = new XMLParser(this._parseOptions);

    if (validation === true) {
      const json = xmlParser.parse(xml).tv;

      if (!json.channel) {
        return;
      }

      const { channel, programme } = filterIds
        ? this.filterModelIds(
            Array.isArray(json.channel) ? json.channel : [json.channel],
            json.programme || [],
            filterIds
          )
        : json;

      const filteredChannel = (channel as ChannelModel[]).filter(
        (c, i, channels) =>
          i === channels.findIndex((cc) => cc['@_id'] === c['@_id'])
      );

      const filteredProgramme = this.filterProgammesByTime(
        (programme as ProgrammeModel<Date>[]).filter(
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

      if (filteredChannel.length && filteredProgramme.length) {
        this._valid = true;

        return await this.populateModels({
          url: url,
          xmlTv: {
            channel: filteredChannel,
            programme: filteredProgramme,
          },
        });
      }

      this._valid = false;

      return;
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
