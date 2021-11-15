import * as StringSimilarity from 'string-similarity';
import FuzzySet from 'fuzzyset.js';
import Logger from '@shared/Logger';

class Matcher {
  private _names: XMLTV.CodeBaseSorted;
  private _namesSet: FuzzySet;
  private _ids: XMLTV.CodeBaseSorted;
  private _idsSet?: FuzzySet;

  constructor(codes: XMLTV.CodeModel[]) {
    const { id, name } = this.createSets(codes);

    this._ids = id;
    this._names = name;

    this._idsSet = FuzzySet(Object.keys(id));
    this._namesSet = FuzzySet(Object.keys(name));
  }

  public match = (options: M3U.MatchOptions) => {
    const { id, name, formatted, listAll } = options;

    const idMatches = Array.isArray(id)
      ? id
          .reduce<[number, string][]>(
            (acc, id) => [...acc, ...this.matches({ id })],
            []
          )
          .sort(([a], [b]) => b - a)
      : this.matches({ id }, 0.8);

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
        ...this.matchFormatted(idMatchesList, 'id'),
        ...this.matchFormatted(nameMatchesList, 'name'),
      ]
        .filter((a) => a)
        .sort((a, b) => b.score - a.score) as XMLTV.CodeMatch[];

      return listAll ? matches : matches.slice(0, 1);
    }

    const matches = [...idMatches, ...nameMatches].sort(([a], [b]) => b - a);

    return listAll ? matches : matches.slice(0, 1);
  };

  private matches = (options: M3U.MatchOptionsSingle, minScore = 0.5) => {
    if (options.id && options.name) {
      throw new Error(
        '[Matcher.matches]: Matching cannot contain both id and name'
      );
    }

    const { id, name } = options;

    if (id) {
      return (
        this._idsSet?.get(id)?.filter(([score]) => score >= minScore) || []
      );
    }

    if (name) {
      const match = StringSimilarity.findBestMatch(name, Object.keys(this._names)).bestMatch;

      if (match.rating > minScore) {
        return [[match.rating, match.target]] as [number, string][];
      }
    }

    return [];
  };

  private matchFormatted = (matches: [number, string][], type: string) => {
    return matches
      .filter((match) => match)
      .map(([score, match]) => ({
        score,
        match,
        code: this.getCodeByAttr(match, type),
      }));
  };

  private getCodeByAttr = (value: string, attr: string) => {
    switch (attr) {
      case 'id':
        return this._ids[value];
      case 'name':
        return this._names[value];
      default:
        return null;
    }
  };

  private createSets = (codes: XMLTV.CodeModel[]) => {
    return codes.reduce<{
      id: XMLTV.CodeBaseSorted;
      name: XMLTV.CodeBaseSorted;
    }>(
      (acc, code) => {
        if (!code.tvgId) {
          Logger.warn(
            `[Matcher.createSets]: Code does not contain a tvg-id -> ${JSON.stringify(
              code,
              null,
              2
            )}`
          );
          return acc;
        }

        const idCode = code.tvgId.replace('.', '');

        acc.id[idCode.toLowerCase()] = code;
        acc.name[code.displayName.toLowerCase()] = code;

        return acc;
      },
      {
        id: {},
        name: {},
      }
    );
  };
}

export default Matcher;
