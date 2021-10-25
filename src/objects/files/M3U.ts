import {
  getFromUrl,
  getJson,
  parseChannelName,
  parseCountryFromChannelName,
  parseIdFromChannelName,
  saveJson,
  validateDateOrThrow,
} from "@shared/functions";
import M3U from "M3U";
import EPG from "EPG";

const M3U_URL = process.env.M3U_URL as string;
const M3U_FILE = process.env.M3U_FILE as string;
const CUSTOM_MAPPINGS_FILE = process.env.CUSTOM_MAPPINGS_FILE as string;

const M3U_INFO_REGEX =
  /^#EXTINF:.?(?<extInf>\d) *group-title="(?<group>.*?)" *tvg-id="(?<id>.*?)" *tvg-logo="(?<logo>.*?)" *,(?<name>.*)/;
const CHANNEL_MATCHING_REGEX =
  /^((.*?:( *)?)|([A-Z]{2} ?\((?<region>.*?)\) )?)?((?<nameCode>[A-Z]{4}) TV)?(?<name>.*?)( *)?(?<definition>F?HD)?$/i;

class M3UFile {
  private _loaded = false;
  private _json?: M3U.Base;

  public load = async (uniqueOnly: boolean = true): Promise<M3U.Base> => {
    if (this._json) {
      this._loaded = true;
      return this._json;
    }

    this._json = await this.getJson();

    if (uniqueOnly) {
      this._json.m3u = this.filterUnique(this._json.m3u);
    }

    this._loaded = true;

    return this._json;
  };

  public insertCodeInfo = async (codes: { [tvgId: string]: EPG.Code }) => {
    if (!this._json) {
      throw new Error("[M3UFile]: M3U JSON is empty");
    }

    let customMappings: M3U.CustomMappings;

    try {
      const json = await getJson(CUSTOM_MAPPINGS_FILE);
      customMappings = JSON.parse(json);
    } catch (err) {
      console.log("[M3UFile]: Custom Mappings JSON is empty");
    }

    const { m3u, ids } = this._json?.m3u.reduce<{
      m3u: M3U.Group[];
      ids: M3U.CustomMappings;
    }>(
      (acc, channel) => {
        if (!channel.url) {
          return acc;
        }

        const code = codes[channel.url];

        if (!code) {
          acc.m3u.push(channel);

          acc.ids[channel.url] = {
            ...channel,
            name: null,
            confirmed: false,
            id: null,
            logo: null,
            country: null,
          };

          return acc;
        }

        const customMapping =
          customMappings &&
          customMappings[channel.url]?.confirmed &&
          customMappings[channel.url];

        const append = customMapping ? {
            id: customMapping.id || "",
            name: customMapping.name || channel.name,
            logo: customMapping.logo || channel.logo,
            country: customMapping.country || channel.country,
        } : {
            id: code.tvg_id,
            name: code.display_name,
            logo: channel.logo || code.logo,
            country: channel.country || code.country,
        }
          
        acc.m3u.push({
          ...channel,
          ...append,
        });

        acc.ids[channel.url] = {
          ...channel,
          ...append,
          confirmed: (customMapping && customMapping.confirmed) || false,
        };

        return acc;
      },
      {
        m3u: [],
        ids: {},
      }
    );

    this._json.m3u = m3u;

    await saveJson(CUSTOM_MAPPINGS_FILE, ids);
    await saveJson(M3U_FILE, this._json);
  };

  public get groups(): M3U.Group[] {
    if (!this.isLoaded) {
      throw new Error("[M3UFile]: M3U JSON is not loaded");
    }

    return this._json?.m3u || [];
  }

  public get isLoaded() {
    return this._loaded;
  }

  public toString = () => {
    if (!this._json) {
      throw new Error("[M3UFile]: M3U JSON is empty");
    }
  console.log(this._json.m3u.filter((m) => m.region));
    return [
      "#EXTM3U ",
      ...this._json.m3u.map((d) => {
        return [
          `#EXTINF: -1 group-title="${d.group}" tvg-id="${d.id}" tvg-logo="${d.logo}", ${d.name}`,
          d.url,
        ].join("\n");
      }),
    ].join("\n");
  };

  private filterUnique = (groups: M3U.Group[]) => {
    const groupDictionary = groups.reduce<{
      [key: string]: { [key: string]: M3U.Group };
    }>((acc, group) => {
      const matches = group.name.match(CHANNEL_MATCHING_REGEX);

      const info = matches?.groups;
      if (info?.name) {
        if (!acc[info.name]) {
          acc[info.name] = {};
        }
        
        acc[info.name][info.definition || "SD"] = {
          ...group,
          ...info,
        };
      }

      return acc;
    }, {});

    return Object.values(groupDictionary).map(
      (list) => list["FHD"] || list["HD"] || list["SD"]
    );
  };

  private parseJson = (m3u: string) => {
    const split = m3u.split("\n");

    const json = split.reduce<M3U.Group[]>((acc, line) => {
      if (acc.length > 0 && line[0] && line[0] !== "#") {
        const entry = acc.pop() as M3U.Group;
        entry.url = line;
        acc.push(entry);
        return acc;
      }

      const matches = line.match(M3U_INFO_REGEX);

      if (!matches?.groups) return acc;

      const { group, id, logo, name, nameCode } = matches.groups;

      acc.push({
        group,
        id,
        logo,
        name,
        country: parseCountryFromChannelName(name),
        originalName: name || nameCode,
        parsedName: parseChannelName(name),
        parsedIds: [nameCode].concat(parseIdFromChannelName(name) || []).filter((n) => n),
      });

      return acc;
    }, []);

    return json;
  };

  private getJson = async (): Promise<M3U.Base> => {
    try {
      const m3uFile = await getJson(M3U_FILE);

      const json = JSON.parse(m3uFile) as M3U.Base;

      validateDateOrThrow(json.date, `Outdated: [${M3U_FILE}]`);

      return json;
    } catch (err) {
      const fileJson = await getFromUrl(M3U_URL);

      const json = {
        date: Date.now(),
        m3u: this.parseJson(fileJson),
      };

      await saveJson(M3U_FILE, json);

      return json;
    }
  };
}

export default M3UFile;
