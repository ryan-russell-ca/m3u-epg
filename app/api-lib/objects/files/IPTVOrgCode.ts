import { getFromUrl, getJson } from '@/api-lib/common/functions';
import Logger from '@/api-lib/modules/Logger';
import MongoConnector from '@/api-lib/db/mongo';
import XMLTVCodesModel, { XMLTVCodeModel } from '@/api-lib/db/xmltvCodeSchema';
import BaseFile from './BaseFile';
import { CodeBaseDocument, CodeModel, CodeRaw } from '@/types/xmltv';

const CODES_JSON_URL = process.env.CODES_JSON_URL as string;
const COUNTRY_WHITELIST = JSON.parse(process.env.COUNTRY_WHITELIST as string);
const CODES_EXPIRATION_MILLI =
  parseInt(process.env.CODES_EXPIRATION_SECONDS as string) * 1000;

class IPTVOrgCode extends BaseFile<CodeBaseDocument> {
  protected _expirationMilli = CODES_EXPIRATION_MILLI;

  public load = async (refresh = false): Promise<boolean> => {
    if (this.model && !refresh && !this.expired) {
      this._loaded = true;
      Logger.info('[IPTVOrgCode.load]: IPTVOrgCode already loaded');
      return false;
    }

    Logger.info('[IPTVOrgCode.load]: Loading IPTVOrgCode...');

    if (!MongoConnector.connected) {
      await MongoConnector.connect();
    }

    this._model = await this.getCodes(refresh);

    this._loaded = true;

    return true;
  };

  public getCodesByTvgIds = (tvgIds: string[]) => {
    return (
      this.model?.codes
        .filter((code) => tvgIds.includes(code.tvgId))
        .map((code) => code.toJSON()) || []
    );
  };

  private insertCodes = async (codes: CodeModel[]) => {
    Logger.info('[insertCodes]: Mapping codes');

    const operations = codes.map((c) => ({
      updateOne: {
        filter: { tvgId: c.tvgId },
        update: {
          $set: {
            tvgId: c.tvgId,
            displayName: c.displayName,
            logo: c.logo,
            country: c.country,
            guides: c.guides,
          },
        },
        upsert: true,
      },
    }));

    Logger.info('[insertCodes]: Saving codes');

    const { insertedIds, upsertedIds } = await XMLTVCodeModel.bulkWrite(
      operations
    );

    return [...Object.values(insertedIds), ...Object.values(upsertedIds)];
  };

  public save = async () => {
    if (!this._model) {
      throw new Error('[IPTVOrgCode.save]: IPTVOrgCode JSON is empty');
    }

    Logger.info('[IPTVOrgCode.save]: Saving code file...');

    await this._model.save();

    return true;
  };

  public get codeList() {
    return this.model?.codes.map((code) => code.toJSON()) || [];
  }

  private getCodes = async (refresh = false): Promise<CodeBaseDocument> => {
    try {
      if (refresh) {
        Logger.info('[IPTVOrgCode.getCodes]: Forcing refresh...');
        return this.createCodes();
      }

      const model = await XMLTVCodesModel.findOne(
        {},
        {},
        { sort: { date: -1 } }
      ).populate('codes');

      if (!model) {
        Logger.info('[IPTVOrgCode.getCodes]: No XMLTV codes entry found');
        return this.createCodes();
      }

      if (this.checkExpired(model)) {
        Logger.info('[IPTVOrgCode.getCodes]: XMLTV codes entry expired');
        return this.createCodes();
      }

      Logger.info(
        `[IPTVOrgCode.getCodes]: Found ${model.codes.length} XMLTV codes `
      );

      return model;
    } catch (error) {
      Logger.err(error);
      throw error;
    }
  };

  private createCodes = async (): Promise<CodeBaseDocument> => {
    Logger.info('[IPTVOrgCode.createCodes]: Creating XMLTV codes...');

    const base = await this.getJson();

    const baseFiltered = base.filter(({ country }) =>
      COUNTRY_WHITELIST.includes(country)
    );

    const codes = baseFiltered.map((code) => {
      return {
        ...code,
        tvgId: code.tvg_id,
        displayName: code.display_name,
      };
    });

    const ids = await this.insertCodes(codes);

    Logger.info(`[IPTVOrgCode.createCodes]: Created ${ids.length} XMLTV codes`);

    this._expired = false;

    return (
      await XMLTVCodesModel.create({
        codes: ids,
      })
    ).populate('codes');
  };

  private getJson = async (): Promise<CodeRaw[]> => {
    Logger.info('[IPTVOrgCode.getJson]: Downloading codes...');

    try {
      if (process.env.CODES_JSON_STATIC_DATA_FILE) {
        return JSON.parse(
          await getJson(process.env.CODES_JSON_STATIC_DATA_FILE)
        );
      }

      return JSON.parse(await getFromUrl(CODES_JSON_URL));
    } catch (error) {
      Logger.err(error);
      throw error;
    }
  };
}

export default IPTVOrgCode;
