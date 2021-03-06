import { Definition } from '@/api-lib/objects/files/M3U';
import fs from 'fs/promises';
import https from 'https';
import URL from 'url';
import Logger from '@/api-lib/modules/Logger';
import { xmlDate, xmlDateStrings } from '@/types/xml';
import { ChannelInfoModel, ChannelOrderModel } from '@/types/m3u';
import readline from 'readline';
import { XMLBuilder, XmlBuilderOptions } from 'fast-xml-parser';
import { ChannelDocument, ProgrammeDocument } from '@/types/xmltv';

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

export const xmlDateToDate = ({
  year,
  month,
  day,
  hour,
  minute,
  second,
}: xmlDate) => {
  return new Date(Date.UTC(year, month, day, hour, minute, second));
};

const padDateNumber = (n: number) => {
  return n.toString().padStart(2, '0');
};

export const dateToXmlDate = (date: Date) => {
  return (
    date.getFullYear() +
    padDateNumber(date.getMonth() + 1) +
    padDateNumber(date.getDate()) +
    padDateNumber(date.getHours()) +
    padDateNumber(date.getMinutes()) +
    padDateNumber(date.getSeconds()) +
    ' +0000'
  );
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
  const countryMatches = name.match(/^ *?((?<country>.*)) *?:.*$/);
  const country = countryMatches?.groups?.country;

  if (country) {
    return country.toLowerCase();
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

export const parseJson = (playlistFileStr: string) => {
  const split = playlistFileStr.split('\n');

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

    const parsedId = parseIdFromChannelName(name);

    acc.push({
      group: group || null,
      tvgId: tvgId || null,
      logo: logo || null,
      name,
      country: parseCountryFromChannelName(name),
      originalName: name || line,
      parsedName: parseChannelName(name),
      parsedIds: parsedId ? [parsedId] : [],
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

export const counterLog = (message: string) => {
  readline.moveCursor(process.stdout, 0, -1);
  readline.clearLine(process.stdout, 1);
  Logger.info(message);
};

export const document2Xml = (
  documents: Record<string, unknown>[],
  tagName: string,
  parseOptions: Partial<XmlBuilderOptions>
) => {
  const channelBuilder = new XMLBuilder({
    ...parseOptions,
    arrayNodeName: tagName,
  });

  return channelBuilder.build(documents);
};

export const orderMap = ({ details }: ChannelOrderModel, i: number) => ({
  details,
  order: i + 1,
});

const escapeAmp = (str: string) => {
  return str.replace(/&(?![a-z]*;)/g, '&amp;');
};

export const mapProgramme = (programme: ProgrammeDocument) => {
  const pp = programme.toJSON();

  return {
    '@_start': dateToXmlDate(pp['@_start'] as Date),
    '@_stop': dateToXmlDate(pp['@_stop'] as Date),
    '@_channel': pp['@_channel'],
    category: {
      '#text': escapeAmp(pp.category?.['#text'] || ''),
      '@_lang': pp.category?.['@_lang'] || '',
    },
    desc: {
      '#text': escapeAmp(pp.desc?.['#text'] || ''),
      '@_lang': pp.desc?.['@_lang'] || '',
    },
    title: {
      '#text': escapeAmp(pp.title?.['#text'] || ''),
      '@_lang': pp.title?.['@_lang'] || '',
    },
  };
};

export const mapChannel = (channel: ChannelDocument) => {
  return {
    '@_id': channel['@_id'],
    'display-name': channel['display-name'],
    icon: {
      '@_src': channel.icon['@_src'],
    },
  };
};

export const redirectToLogin = () => ({
  redirect: {
    destination: `/login`,
    permanent: false,
  },
});

export const getServerSidePropsFetch = (isServer: boolean) => {
  if (isServer) {
    return async (uri = '') => await fetch(`http://iptv-app:3000/api${uri}`);
  }

  return async (uri = '') =>
    await fetch(`http://${location.hostname}:${location.port}/api${uri}`);
};
