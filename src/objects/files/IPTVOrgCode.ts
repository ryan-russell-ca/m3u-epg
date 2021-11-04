import { getFromUrl } from "@shared/functions";
import Logger from "@shared/Logger";
import MongoConnector from "@objects/database/Mongo";
import XMLTVCodesModel, {
  XMLTVCodeModel,
} from "@objects/database/XMLTVCodeSchema";

const CODES_JSON_URL = process.env.CODES_JSON_URL as string;
const COUNTRY_WHITELIST = JSON.parse(process.env.COUNTRY_WHITELIST as string);
const CODES_EXPIRATION_MILLI =
  parseInt(process.env.CODES_EXPIRATION_SECONDS as string) * 1000;

class IPTVOrgCode {
  private _loaded = false;
  private _model?: XMLTV.CodeBaseDocument;

  public load = async (refresh = false): Promise<XMLTV.CodeBaseDocument> => {
    if (this._model && !refresh) {
      this._loaded = true;
      return this._model;
    }

    if (!MongoConnector.connected) {
      await MongoConnector.connect();
    }

    this._model = await this.getCodes(refresh);

    this._loaded = true;

    return this._model;
  };

  public get isLoaded() {
    return this._loaded;
  }

  public get codeList() {
    return this._model?.codes.map((code) => code.toJSON()) || [];
  }

  public getCodesByTvgIds = (tvgIds: string[]) => {
    return (
      this._model?.codes
        .filter((code) => tvgIds.includes(code.tvgId))
        .map((code) => code.toJSON()) || []
    );
  };

  public save = async () => {
    if (!this._model) {
      throw new Error("[IPTVOrgCode.save]: IPTVOrgCode JSON is empty");
    }

    Logger.info("[IPTVOrgCode.save]: Saving code file");

    await XMLTVCodeModel.bulkSave(this._model.codes);
    await this._model.save();

    return true;
  };

  private getCodes = async (
    refresh = false
  ): Promise<XMLTV.CodeBaseDocument> => {
    try {
      if (refresh) {
        Logger.info("[IPTVOrgCode.getCodes]: Forcing refresh");
        return this.createCodes();
      }

      const model = await XMLTVCodesModel.findOne()
        .sort({ date: 1 })
        .populate("codes");

      if (!model) {
        Logger.info("[IPTVOrgCode.getCodes]: No XMLTV codes entry found");
        return this.createCodes();
      }

      if (
        (model.date?.getTime() || 0) + CODES_EXPIRATION_MILLI <
        new Date().getTime()
      ) {
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
    const base = await this.getJson();
    const baseFiltered = base.filter(({ country }) =>
      COUNTRY_WHITELIST.includes(country)
    );

    const codeModels = await XMLTVCodeModel.find({
      tvgId: baseFiltered.map((code) => code.tvg_id),
    });

    const codes = baseFiltered.map(
      (code) =>
        codeModels.find((c) => c.tvgId === code.tvg_id) ||
        new XMLTVCodeModel({
          ...code,
          tvgId: code.tvg_id,
          displayName: code.display_name,
        })
    );

    const baseModel = new XMLTVCodesModel({ codes });

    Logger.info(
      `[IPTVOrgCode.createCodes]: Created ${baseModel.codes.length} XMLTV codes `
    );

    return baseModel;
  };

  private getJson = async (): Promise<XMLTV.CodeRaw[]> => {
    try {
      return JSON.parse(await getFromUrl(CODES_JSON_URL));
    } catch (error) {
      Logger.err(error);
      throw error;
    }
  };
}

export default IPTVOrgCode;
