import { getFromUrl, getJson } from "@shared/functions";
import Logger from "@shared/Logger";
import MongoConnector from "@objects/database/Mongo";
import xmltvCodesModel, {
  xmltvCodeModel,
} from "@objects/database/XMLTVCodeSchema";
import BaseFile from "./BaseFile";

const CODES_JSON_URL = process.env.CODES_JSON_URL as string;
const COUNTRY_WHITELIST = JSON.parse(process.env.COUNTRY_WHITELIST as string);
const CODES_EXPIRATION_MILLI =
  parseInt(process.env.CODES_EXPIRATION_SECONDS as string) * 1000;

class IPTVOrgCode extends BaseFile<XMLTV.CodeBaseDocument> {
  protected _expirationMilli = CODES_EXPIRATION_MILLI;

  public load = async (refresh = false): Promise<boolean> => {
    if (this.model && !refresh && !this.expired) {
      this._loaded = true;
      Logger.info("[IPTVOrgCode.load]: IPTVOrgCode already loaded");
      return false;
    }

    Logger.info("[IPTVOrgCode.load]: Loading IPTVOrgCode...");

    if (!MongoConnector.connected) {
      await MongoConnector.connect();
    }

    this._model = await this.getCodes(refresh);

    await this.save();

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

  public save = async () => {
    if (!this._model) {
      throw new Error("[IPTVOrgCode.save]: IPTVOrgCode JSON is empty");
    }

    Logger.info("[IPTVOrgCode.save]: Saving code file...");

    await xmltvCodeModel.bulkSave(this._model.codes);
    await this._model.save();

    return true;
  };

  public get codeList() {
    return this.model?.codes.map((code) => code.toJSON()) || [];
  }

  private getCodes = async (
    refresh = false
  ): Promise<XMLTV.CodeBaseDocument> => {
    try {
      if (refresh) {
        Logger.info("[IPTVOrgCode.getCodes]: Forcing refresh...");
        return this.createCodes();
      }

      const model = await xmltvCodesModel
        .findOne({}, {}, { sort: { date: -1 } })
        .populate("codes");

      if (!model) {
        Logger.info("[IPTVOrgCode.getCodes]: No XMLTV codes entry found");
        return this.createCodes();
      }

      if (this.checkExpired(model)) {
        Logger.info("[IPTVOrgCode.getCodes]: XMLTV codes entry expired");
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

  private createCodes = async (): Promise<XMLTV.CodeBaseDocument> => {
    Logger.info("[IPTVOrgCode.createCodes]: Creating XMLTV codes...");

    const base = await this.getJson();

    const baseFiltered = base.filter(({ country }) =>
      COUNTRY_WHITELIST.includes(country)
    );

    const codeModels = await xmltvCodeModel.find({
      tvgId: baseFiltered.map((code) => code.tvg_id),
    });

    const codes = baseFiltered.map((code) => {
      const codeModel = codeModels.find((c) => c.tvgId === code.tvg_id);

      if (codeModel) {
        codeModel.set({
          ...code,
          tvgId: code.tvg_id,
          displayName: code.display_name,
        });

        return codeModel;
      }

      return new xmltvCodeModel({
        ...code,
        tvgId: code.tvg_id,
        displayName: code.display_name,
      });
    });

    const baseModel = new xmltvCodesModel({ codes });

    Logger.info(
      `[IPTVOrgCode.createCodes]: Created ${baseModel.codes.length} XMLTV codes`
    );

    this._expired = false;

    return baseModel;
  };

  private getJson = async (): Promise<XMLTV.CodeRaw[]> => {
    Logger.info("[IPTVOrgCode.getJson]: Downloading codes...");

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
