import FuzzySet from "fuzzyset.js";
import { getFromUrl } from "@shared/functions";
import Logger from "@shared/Logger";
import XMLTVCodesModel, {
  XMLTVCodeModel,
} from "@objects/database/XMLTVCodeSchema";

const CODES_JSON_URL = process.env.CODES_JSON_URL as string;
const CODES_EXPIRATION_MILLI =
  parseInt(process.env.CODES_EXPIRATION_SECONDS as string) * 1000;

const COUNTRIES_FILTER = ["ca", "us", "uk"];

class IPTVOrgCode {
  private _loaded = false;
  private _json?: XMLTV.CodeBaseDocument;
  private _jsonNames?: XMLTV.CodeBaseSorted;
  private _jsonNamesSet?: FuzzySet;
  private _jsonIds?: XMLTV.CodeBaseSorted;
  private _jsonIdsSet?: FuzzySet;

  public load = async (refresh = false): Promise<XMLTV.CodeBaseDocument> => {
    if (this._json) {
      this._loaded = true;
      return this._json;
    }

    this._json = await this.getCodes(refresh);

    this._loaded = true;

    return this._json;
  };

  public get isLoaded() {
    return this._loaded;
  }

  public match = (options: XMLTV.MatchOptions) => {
    const { id, name, formatted, listAll } = options;

    if (!this._jsonNamesSet) {
      this.createSets();
    }

    if (!this._jsonIdsSet) {
      this.createSets();
    }

    const idMatches = Array.isArray(id)
      ? id
          .reduce<[number, string][]>(
            (acc, id) => [...acc, ...this.matches({ id })],
            []
          )
          .sort(([a], [b]) => b - a)
      : this.matches({ id });

    const nameMatches = Array.isArray(name)
      ? name
          .reduce<[number, string][]>(
            (acc, name) => [...acc, ...this.matches({ name })],
            []
          )
          .sort(([a], [b]) => b - a)
      : this.matches({ name });

    const idMatchesList = listAll ? idMatches : idMatches.slice(0, 1);
    const nameMatchesList = listAll ? nameMatches : nameMatches.slice(0, 1);

    if (formatted) {
      const matches = [
        ...this.matchFormatted(idMatchesList, "id"),
        ...this.matchFormatted(nameMatchesList, "name"),
      ]
        .filter((a) => a)
        .sort((a, b) => b.score - a.score) as XMLTV.CodeMatch[];

      return listAll ? matches : matches.slice(0, 1);
    }

    const matches = [...idMatches, ...nameMatches].sort(([a], [b]) => b - a);

    return listAll ? matches : matches.slice(0, 1);
  };

  private matches = (options: XMLTV.MatchOptionsSingle, minScore = 0.5) => {
    if (options.id && options.name) {
      throw new Error(
        "[IPTVOrgCode.matches]: Matching cannot contain both id and name"
      );
    }

    const { id, name } = options;

    if (id) {
      return (
        this._jsonIdsSet?.get(id)?.filter(([score]) => score >= minScore) || []
      );
    }

    if (name) {
      return (
        this._jsonNamesSet?.get(name)?.filter(([score]) => score >= minScore) ||
        []
      );
    }

    return [];
  };

  private matchFormatted = (matches: [number, string][], type: string) => {
    if (!this._jsonIds || !this._jsonNames) {
      throw new Error("[IPTVOrgCode.matchFormatted]: XMLTV has no sets");
    }

    return matches
      .filter((match) => match)
      .map(([score, match]) => ({
        score,
        match,
        code: this.getCodeByAttr(match, type),
      }));
  };

  private createSets = () => {
    if (!this._json) {
      throw new Error("[IPTVOrgCode.createSets]: XMLTV JSON is empty");
    }

    const { id, name } = this.filterJsonByCountry(this._json).codes.reduce<{
      id: XMLTV.CodeBaseSorted;
      name: XMLTV.CodeBaseSorted;
    }>(
      (acc, code) => {
        if (!code.tvgId) {
          return acc;
        }

        const [idCode] = code.tvgId.replace(".", "");

        acc.id[idCode.toLowerCase()] = code;
        acc.name[code.displayName.toLowerCase()] = code;

        return acc;
      },
      {
        id: {},
        name: {},
      }
    );

    this._jsonIds = id;
    this._jsonNames = name;

    this._jsonIdsSet = FuzzySet(Object.keys(this._jsonIds));
    this._jsonNamesSet = FuzzySet(Object.keys(this._jsonNames));
  };

  private getCodeByAttr = (value: string, attr: string) => {
    if (!this._jsonIds || !this._jsonNames) {
      throw new Error("[IPTVOrgCode.getCodeByAttr]: XMLTV has no sets");
    }

    switch (attr) {
      case "id":
        return this._jsonIds[value];
      case "name":
        return this._jsonNames[value];
      default:
        return null;
    }
  };

  private saveModels = async (
    xmlTvCodes: XMLTV.CodeBaseDocument,
    codes: XMLTV.CodeDocument[]
  ) => {
    await XMLTVCodeModel.bulkSave(codes);
    await xmlTvCodes.save();

    return true;
  };

  private getCodes = async (
    refresh = false
  ): Promise<XMLTV.CodeBaseDocument> => {
    try {
      if (refresh) {
        Logger.info("[IPTVOrgCode.getCodes]: Forcing refresh");
        throw new Error();
      }

      const codes = await XMLTVCodesModel.findOne()
        .sort({ date: 1 })
        .populate("codes");

      if (
        !codes ||
        (codes.date?.getTime() || 0) + CODES_EXPIRATION_MILLI <
          new Date().getTime()
      ) {
        Logger.info("[IPTVOrgCode.getCodes]: No XMLTV codes entry found");
        throw new Error();
      }

      return codes;
    } catch (error) {
      const json = await this.getJson();

      const codeModels = await XMLTVCodeModel.find({
        tvgId: json.map((code) => code.tvg_id),
      });

      const codes = json.map(
        (code) =>
          codeModels.find((c) => c.tvgId === code.tvg_id) ||
          new XMLTVCodeModel({
            ...code,
            tvgId: code.tvg_id,
            displayName: code.display_name,
          })
      );

      const xmlTvCodes = new XMLTVCodesModel({ codes });

      this.saveModels(xmlTvCodes, codes);

      return xmlTvCodes;
    }
  };

  private getJson = async (): Promise<XMLTV.CodeRaw[]> => {
    return JSON.parse(await getFromUrl(CODES_JSON_URL));
  };

  private filterJsonByCountry = (
    json: XMLTV.CodeBaseModel,
    countries = COUNTRIES_FILTER
  ): XMLTV.CodeBaseModel => {
    if (!json) {
      Logger.info("[IPTVOrgCode.filterJsonByCountry]: XMLTV JSON is empty");
      throw new Error("[IPTVOrgCode.filterJsonByCountry]: XMLTV JSON is empty");
    }

    return {
      ...json,
      codes: json.codes.filter((code) => countries.includes(code.country)),
    };
  };
}

export default IPTVOrgCode;
