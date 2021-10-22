import { getFromUrl, parseChannelName, parseCountryFromChannelName, validateDateOrThrow } from "@shared/functions";
import fs from "fs/promises";
import M3U from "M3U";

const M3U_URL = process.env.M3U_URL as string;
const M3U_FILE = process.env.M3U_FILE as string;

class M3UPlaylist {
  private _m3u: string;
  private _json?: M3U.Group[];

  constructor(m3u: string) {
    this._m3u = m3u;
  }

  public static importFile = async () => {
    try {
      const data = await fs.readFile(M3U_FILE, "utf8");

      const json = JSON.parse(data);

      validateDateOrThrow(json.date, "M3U outdated");

      return new M3UPlaylist(json.m3u);
    } catch (err) {
      const fileJson = await getFromUrl(M3U_URL);

      const json = {
        date: Date.now(),
        m3u: fileJson,
      };

      await fs.writeFile(M3U_FILE, JSON.stringify(json, null, 2));

      return new M3UPlaylist(fileJson);
    }
  };

  public json = () => {
    const split = this._m3u.split("\n");

    if (!this._json) {
      this._json = split.reduce<M3U.Group[]>((acc, line) => {
        if (acc.length > 0 && line[0] && line[0] !== "#") {
          const entry = acc.pop() as M3U.Group;
          entry.url = line;
          acc.push(entry);
          return acc;
        }

        const matches = line.match(
          /#EXTINF:.?(?<extInf>\d) *group-title="(?<group>.*?)" *tvg-id="(?<id>.*?)" *tvg-logo="(?<logo>.*?)" *,(?<name>.*)/
        );

        if (!matches) return acc;

        const { extInf, group, id, logo, name } = matches.groups as M3U.Group;

        acc.push({
          extInf,
          group,
          id,
          logo,
          name,
          country: parseCountryFromChannelName(name),
          originalName: name,
          parsedName: parseChannelName(name),
        });

        return acc;
      }, []);
    }

    return this._json;
  };

  public text = () => this.createOutput();

  public static json2M3U = (json: M3U.Group[]) => {
    return [
      "#EXTM3U ",
      ...json.map((d) => {
        const name = d.name.trim();
        return [
          `#EXTINF: -1 group-title="${d.group}" tvg-id="${d.id}" tvg-logo="${d.logo}", ${name}`,
          d.url,
        ].join("\n");
      }),
    ].join("\n");
  };

  private createOutput = (json = this.json()) => {
    this._json = json;
    return M3UPlaylist.json2M3U(json);
  };
}

export default M3UPlaylist;
