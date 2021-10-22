import fs from "fs/promises";
import process from "process";
import URL from "url";
import xmlParser, { j2xParser } from "fast-xml-parser";
import { getFromUrl, parseXmlDate, validateDateOrThrow } from "@shared/functions";
import M3U from "M3U";
import EPG from "EPG";
import { createIdDictionary } from "@shared/mapping";

const CODES_JSON_FILE = process.env.CODES_JSON_FILE as string;
const CODES_JSON_URL = process.env.CODES_JSON_URL as string;
const EPG_FILES_DIR = process.env.EPG_FILES_DIR as string;
const EPG_JSON_FILE = process.env.EPG_JSON_FILE as string;
const EPG_TIME_AHEAD_MILLI =
  parseInt(process.env.EPG_TIME_AHEAD_SECONDS as string) * 1000;

class EPGXml {
  private _json?: EPG.CodeBase;
  private _jsonNames?: EPG.CodeBaseSorted;
  private _jsonIds?: EPG.CodeBaseSorted;
  private _guides: { [key: string]: boolean } = {};

  public load = async (): Promise<EPG.CodeBase> => {
    try {
      const codeFile = await fs.readFile(CODES_JSON_FILE, "utf8");

      this._json = JSON.parse(codeFile) as EPG.CodeBase;

      return this.filterJson();
    } catch (err) {
      const fileJson = await getFromUrl(CODES_JSON_URL);
      this._json = {
        date: Date.now(),
        codes: JSON.parse(fileJson),
      };

      await fs.writeFile(CODES_JSON_FILE, JSON.stringify(this._json, null, 2));

      return this.filterJson();
    }
  };

  private filterJson = (countries = ["ca", "us", "uk"]): EPG.CodeBase => {
    if (!this._json) {
      throw new Error("EPGXml JSON is empty");
    }

    const codes = this._json.codes.filter((code) => {
      return countries.includes(code.country);
    });

    this._json = {
      ...this._json,
      codes,
    };

    return this._json;
  };

  public addTvgIds = (groups: M3U.Group[]): M3U.Group[] => {
    if (!this._jsonIds) {
      this.sortJson();

      if (!this._jsonIds) {
        throw new Error("EPGXml JSON ids is empty");
      }
    }

    const idKeys = Object.keys(this._jsonIds);

    const updatedIds = groups.map((group) => {
      if (group.id) {
        const codeId = group.id.toLowerCase();

        const codeById =
          codeId &&
          idKeys.find(
            (id) =>
              (!group.country || id.endsWith(group.country)) &&
              id.startsWith(codeId) &&
              Math.abs(codeId.length - id.length) < 4
          );

        if (codeById) {
          const ch = (this._jsonIds as EPG.CodeBaseSorted)[codeById];

          this.addGuide(ch.guides, ch.country);

          return {
            ...group,
            name: ch.display_name || group.name,
            logo: group.logo || ch.logo,
            id: ch.tvg_id,
          };
        }
      }

      const codeParsedName = group.parsedName;

      const codeByParsedName =
        codeParsedName &&
        idKeys.find(
          (id) =>
            (!group.country || id.endsWith(group.country)) &&
            id.startsWith(codeParsedName) &&
            Math.abs(codeParsedName.length - id.length) < 4
        );

      if (codeByParsedName) {
        const ch = (this._jsonIds as EPG.CodeBaseSorted)[codeByParsedName];

        this.addGuide(ch.guides, ch.country);

        return {
          ...group,
          name: ch.display_name || group.name,
          logo: group.logo || ch.logo,
          id: ch.tvg_id,
        };
      }

      if (!this._jsonNames) {
        this.sortJson();

        if (!this._jsonNames) {
          throw new Error("EPGXml JSON names is empty");
        }
      }

      const nameKeys = Object.keys(this._jsonNames);

      const codeName = group.parsedName;

      const codeByName =
        codeName &&
        nameKeys.find(
          (name) => name.includes(codeName) || codeName.includes(name)
        );

      if (codeByName) {
        const ch = (this._jsonNames as EPG.CodeBaseSorted)[codeByName];

        if (!group.country || ch.tvg_id.endsWith(group.country)) {
          this.addGuide(ch.guides, ch.country);

          return {
            ...group,
            name: ch.display_name || group.name,
            logo: group.logo || ch.logo,
            id: ch.tvg_id,
          };
        }
      }

      return {
        ...group,
        id: "",
      };
    });

    fs.writeFile(
      "./data/static/ids.json",
      JSON.stringify(createIdDictionary(updatedIds), null, 2)
    );

    return updatedIds;
  };

  public getGuides = async () => {
    return await this.parseEpgs();
  };

  private sortJson = (): void => {
    if (!this._json) {
      throw new Error("EPGXml JSON is empty");
    }

    this._jsonIds = this._json.codes.reduce<EPG.CodeBaseSorted>((acc, code) => {
      if (!code.tvg_id) {
        return acc;
      }

      acc[code.tvg_id.toLowerCase()] = code;
      return acc;
    }, {});

    this._jsonNames = this._json.codes.reduce<EPG.CodeBaseSorted>(
      (acc, code) => {
        if (!code.tvg_id) {
          return acc;
        }

        acc[code.display_name.toLocaleLowerCase()] = code;
        return acc;
      },
      {}
    );
  };

  private addGuide = (guides: string[], country: string) => {
    const guide =
      guides.find((guide) => guide.includes(`/${country}/`)) || guides[0];

    if (guide) {
      this._guides[guide] = true;
    }
  };

  private parseEpgs = async (): Promise<string> => {
    const parseOptions = {
      ignoreAttributes: false,
    };

    const parser = new j2xParser(parseOptions);

    try {
      const epgFile = await fs.readFile(EPG_JSON_FILE, "utf8");

      const epg = JSON.parse(epgFile) as EPG.Base;

      validateDateOrThrow(epg.date, "EPG outdated");

      return (
        '<?xml version="1.0" encoding="UTF-8" ?>' +
        parser.parse({ tv: epg.epg }).toString()
      );
    } catch (err: any) {
      console.log(err.message);

      const urls = Object.keys(this._guides);

      const epgs: EPG.Base[] = await Promise.all(
        urls.map(async (url) => {
          const parsedUrl = URL.parse(url);
          const filename = `${EPG_FILES_DIR}/${parsedUrl.pathname
            ?.split("/")
            .slice(-2)
            .join("-")}.json`;

          let epg;

          try {
            const epgFile = await fs.readFile(filename, "utf8");

            epg = JSON.parse(epgFile) as EPG.Base;

            validateDateOrThrow(epg.date, `${filename} outdated`, 86400000);

            return epg;
          } catch (err: any) {
            console.log(err.message);

            const guide = await getFromUrl(url);

            if (xmlParser.validate(guide) === true) {
              const json = xmlParser.parse(guide, parseOptions);

              epg = {
                date: Date.now(),
                epg: json.tv,
              };

              await fs.writeFile(filename, JSON.stringify(epg, null, 2));

              return epg;
            }
          }

          return {
            date: Date.now(),
            epg: [],
          };
        })
      );

      if (!this._jsonIds) {
        this.sortJson();
      }

      const filteredEpgs = epgs.reduce<{
        channel: { [code: string]: EPG.Channel };
        programme: { [code: string]: EPG.Programme[] };
      }>(
        (acc, epgBase) => {
          epgBase.epg.channel.forEach((channel) => {
            if (!this._jsonIds) {
              throw new Error("EPGXml JSON ids is empty");
            }

            const channelKey = channel["@_id"].toLowerCase();

            if (!this._jsonIds[channelKey] || acc.channel[channelKey]) {
              return;
            }

            acc.channel[channelKey] = channel;
            acc.programme[channelKey] = [];
          });

          epgBase.epg.programme.forEach((programme) => {
            const programmeKey = programme["@_channel"].toLowerCase();

            if (!acc.programme[programmeKey]) {
              return;
            }

            const { year, month, day, hour, minute, second } = parseXmlDate(
              programme["@_start"]
            );
            const date = new Date(
              Date.UTC(year, month, day, hour, minute, second)
            );

            const diff = date.getTime() - Date.now();

            if (diff < -3600001 || diff > EPG_TIME_AHEAD_MILLI) {
              return;
            }

            acc.programme[programmeKey].push(programme);
          });

          return acc;
        },
        {
          channel: {},
          programme: {},
        }
      );

      const programmes = Object.values(filteredEpgs.programme);
      const programme = [];

      for (let row of programmes) {
        for (let e of row) {
          programme.push(e);
        }
      }

      const fullEpg: EPG.Base = {
        date: Date.now(),
        epg: {
          channel: Object.values(filteredEpgs.channel),
          programme,
        },
      };

      await fs.writeFile(EPG_JSON_FILE, JSON.stringify(fullEpg, null, 2));

      return (
        '<?xml version="1.0" encoding="UTF-8" ?>' +
        parser.parse({ tv: fullEpg.epg }).toString()
      );
    }
  };
}

export default EPGXml;
