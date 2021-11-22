import { Definition } from '@/objects/files/M3U';
import fs from 'fs/promises';
import https from 'https';
import URL from 'url';
import Logger from '@/shared/modules/Logger';
import { xmlDate, xmlDateStrings } from '@/shared/@types/xml';
import { ChannelInfoModel } from '@/shared/@types/m3u';

interface Match<T> {
  groups?: T;
}

export const parseXmlDate = (dateStr: string): xmlDate => {
  const matches = dateStr.match(
    /(?<year>....)(?<month>..)(?<day>..)(?<hour>..)(?<minute>..)(?<second>..) (?<offsetHour>..)(?<offsetMinute>..)/
  );

  if (!matches?.groups) {
    throw new Error('Bad XML date');
  }

  const { year, month, day, hour, minute, second, offsetHour, offsetMinute } =
    matches.groups as unknown as xmlDateStrings;

  return {
    year: parseInt(year),
    month: parseInt(month) - 1,
    day: parseInt(day),
    hour: parseInt(hour),
    minute: parseInt(minute),
    second: parseInt(second),
    offsetHour: parseInt(offsetHour),
    offsetMinute: parseInt(offsetMinute),
  };
};

export const getFromUrl = async (url: string): Promise<string> => {
  const promise: Promise<string> = new Promise((resolve, reject) => {
    let json = '';
    const parsedUrl = URL.parse(url);

    const options = {
      hostname: parsedUrl.host,
      port: 443,
      path: parsedUrl.pathname,
      method: 'GET',
      timeout: 5000,
    };

    const req = https.request(options, (res) => {
      res.on('data', (d) => {
        json += d;
      });

      res.on('end', () => {
        resolve(json);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });

  return promise;
};

export const parseChannelName = (name: string) =>
  name.split(':').pop()?.replace(/ */, '').toLowerCase() || '';

export const parseCountryFromChannelName = (name: string) => {
  const countryMatches = name.match(/^ *?(?<country>.*){2,2} *?:.*$/g);
  const country = countryMatches?.groups?.country;

  if (country) {
    return country.trim().toLowerCase();
  }

  return 'unpopulated';
};

export const parseIdFromChannelName = (name: string) => {
  const match = name.match(/(?<tvgId>[A-Z0-9]{4,4})/) as Match<{
    tvgId: string;
  }>;

  if (match?.groups?.tvgId) {
    return match?.groups?.tvgId;
  }

  return null;
};

export const saveJson = async (filename: string, data: unknown) => {
  if (!data) {
    Logger.info(`[saveJson]: ${filename} cannot save with empty data`);
    return;
  }

  return await fs.writeFile(filename, JSON.stringify(data, null, 2));
};

export const getJson = async (filename: string) => {
  return await fs.readFile(filename, 'utf8');
};

const XMLTV_TIME_AHEAD_MILLI =
  parseInt(process.env.XMLTV_TIME_AHEAD_SECONDS as string) * 1000;
const XMLTV_TIME_BEHIND_MILLI =
  parseInt(process.env.XMLTV_TIME_BEHIND_SECONDS as string) * 1000;

export const filterProgrammeByDate = (programme: { '@_start': string }) => {
  const { year, month, day, hour, minute, second } = parseXmlDate(
    programme['@_start']
  );

  if (year < 2011) {
    return true;
  }

  const date = new Date(Date.UTC(year, month, day, hour, minute, second));

  const diff = date.getTime() - new Date().getTime();

  if (diff < -XMLTV_TIME_BEHIND_MILLI || diff > XMLTV_TIME_AHEAD_MILLI) {
    return false;
  }

  return true;
};

const M3U_INFO_REGEX =
  /^#EXTINF:.?(?<extInf>\d) *group-title="(?<group>.*?)" *tvg-id="(?<tvgId>.*?)" *tvg-logo="(?<logo>.*?)" *,(?<name>.*)/;

const M3U_TVGID_REGEX = /(?<tvgId>[A-Z0-9]{4,4}) TV/;

export const parseJson = (m3uFileString: string) => {
  const split = m3uFileString.split('\n');

  const channels = split.reduce<ChannelInfoModel[]>((acc, line) => {
    if (acc.length > 0 && line[0] && line[0] !== '#') {
      acc[acc.length - 1].url = line;
      return acc;
    }

    const matches = line.match(M3U_INFO_REGEX) as Match<{
      extInf?: string;
      group?: string;
      tvgId?: string;
      logo?: string;
      name: string;
    }> | null;

    if (!matches?.groups) return acc;

    const { group, tvgId, logo, name } = matches.groups;

    const match = name.match(M3U_TVGID_REGEX) as Match<{
      tvgId: string;
    }> | null;

    const parsedIds = parseIdFromChannelName(name);

    acc.push({
      group: group || null,
      tvgId: tvgId || null,
      logo: logo || null,
      name,
      country: parseCountryFromChannelName(name),
      originalName: name || line,
      parsedName: parseChannelName(name),
      parsedIds: parsedIds ? [parsedIds] : [],
      url: '',
      confirmed: false,
    });

    return acc;
  }, []);

  return channels;
};

const CHANNEL_MATCHING_REGEX =
  /^((.*?:( *)?)|([A-Z]{2} ?\((?<region>.*?)\) )?)?(?<name>.*?)( *)?(?<definition>F?HD)?$/i;

export const filterUnique = (channels: ChannelInfoModel[]) => {
  const channelDictionary = channels.reduce<
    Record<string, Record<string, ChannelInfoModel>>
  >((acc, channel) => {
    const matches = channel.name.match(CHANNEL_MATCHING_REGEX) as Match<{
      region?: string;
      nameCode?: string;
      name?: string;
      definition?: string;
    }>;

    const info = matches?.groups;

    if (info?.name) {
      if (!acc[info.name]) {
        acc[info.name] = {};
      }

      acc[info.name][info.definition || Definition.Unknown] = {
        ...channel,
        ...info,
      };
    }

    return acc;
  }, {});

  return Object.values(channelDictionary).map(
    (list) =>
      list[Definition.FullHighDef] ||
      list[Definition.HighDef] ||
      list[Definition.StandardDef] ||
      list[Definition.Unknown]
  );
};

export const filterRegion = (channels: ChannelInfoModel[]) => {
  return channels.filter((channel) => !channel.region);
};
