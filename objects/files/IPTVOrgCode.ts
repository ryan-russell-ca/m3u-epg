import FuzzySet from "fuzzyset.js";
import {
  getFromUrl,
  getJson,
  saveJson,
  validateDateOrThrow,
} from "@shared/functions";
import EPG from "EPG";

const CODES_JSON_FILE = process.env.CODES_JSON_FILE as string;
const CODES_JSON_URL = process.env.CODES_JSON_URL as string;

type MatchOptions = {
  name?: string | string[];
  id?: string | string[];
  formatted?: boolean;
};

type MatchOptionsSingle = {
  id?: string;
  name?: string;
};

class IPTVOrgCode {
  private _loaded = false;
  private _json?: EPG.CodeBase;
  private _jsonNames?: EPG.CodeBaseSorted;
  private _jsonNamesSet?: FuzzySet;
  private _jsonIds?: EPG.CodeBaseSorted;
  private _jsonIdsSet?: FuzzySet;

  public load = async (): Promise<EPG.CodeBase> => {
    if (this._json) {
      this._loaded = true;
      return this._json;
    }

    this._json = this.filterJson(await this.getJson());

    this._loaded = true;

    return this._json;
  };

  public get isLoaded() {
    return this._loaded;
  }

  public match = (options: MatchOptions) => {
    const { id, name, formatted } = options;

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
          .sort(([a], [b]) => b - a)[0]
      : this.matches({ id })[0];

    const nameMatches = Array.isArray(name)
      ? name
          .reduce<[number, string][]>(
            (acc, name) => [...acc, ...this.matches({ name })],
            []
          )
          .sort(([a], [b]) => b - a)[0]
      : this.matches({ name })[0];

    if (formatted) {
      return [
        ...this.matchFormatted([idMatches], "id"),
        ...this.matchFormatted([nameMatches], "name"),
      ].sort((a, b) => b.score - a.score)[0] as EPG.CodeMatch | null;
    }

    return [idMatches, nameMatches].sort(([a], [b]) => b - a)[0];
  };

  private matches = (options: MatchOptionsSingle) => {
    if (options.id && options.name) {
      throw new Error(
        "[IPTVOrgCode]: Matching cannot contain both id and name"
      );
    }

    const { id, name } = options;

    if (id) {
      return this._jsonIdsSet?.get(id) || [];
    }

    if (name) {
      return this._jsonNamesSet?.get(name) || [];
    }

    return [];
  };

  private matchFormatted = (matches: [number, string][], type: string) => {
    if (!this._jsonIds || !this._jsonNames) {
      throw new Error("[IPTVOrgCode]: EPG has no sets");
    }

    return matches.filter((match) => match).map(([score, match]) => ({
      score,
      match,
      code: this.getCodeByAttr(match, type),
    }));
  };

  private createSets = () => {
    if (!this._json) {
      throw new Error("[IPTVOrgCode]: EPG JSON is empty");
    }

    const { id, name } = this._json.codes.reduce<{
      id: EPG.CodeBaseSorted;
      name: EPG.CodeBaseSorted;
    }>(
      (acc, code) => {
        if (!code.tvg_id) {
          return acc;
        }

        acc.id[code.tvg_id.toLowerCase()] = code;
        acc.name[code.display_name.toLowerCase()] = code;

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
      throw new Error("[IPTVOrgCode]: EPG has no sets");
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

  private getJson = async () => {
    try {
      const codeFile = await getJson(CODES_JSON_FILE);
      const json = JSON.parse(codeFile) as EPG.CodeBase;

      validateDateOrThrow(json.date, `Outdated: [${CODES_JSON_FILE}]`);

      return json;
    } catch (err) {
      console.log(`Refreshing: [${CODES_JSON_URL}]`);

      const fileJson = await getFromUrl(CODES_JSON_URL);

      const json = {
        date: Date.now(),
        codes: JSON.parse(fileJson),
      };

      saveJson(CODES_JSON_FILE, json);

      return json;
    }
  };

  private filterJson = (
    json: EPG.CodeBase,
    countries = ["ca", "us", "uk"]
  ): EPG.CodeBase => {
    if (!json) {
      throw new Error("[IPTVOrgCode]: EPG JSON is empty");
    }

    return {
      ...json,
      codes: json.codes.filter((code) => countries.includes(code.country)),
    };
  };
}

export default IPTVOrgCode;