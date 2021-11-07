import fs from "fs/promises";
import https from "https";
import URL from "url";
import Logger from "./Logger";

export const pErr = (err: Error) => {
  if (err) {
    Logger.err(err);
  }
};

export const parseXmlDate = (dateStr: string): XML.xmlDate => {
  const matches = dateStr.match(
    /(?<year>....)(?<month>..)(?<day>..)(?<hour>..)(?<minute>..)(?<second>..) (?<offsetHour>..)(?<offsetMinute>..)/
  );

  if (!matches?.groups) {
    throw new Error("Bad XML date");
  }

  const { year, month, day, hour, minute, second, offsetHour, offsetMinute } =
    matches.groups as unknown as XML.xmlDateStrings;

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
    let json = "";
    const parsedUrl = URL.parse(url);

    const options = {
      hostname: parsedUrl.host,
      port: 443,
      path: parsedUrl.pathname,
      method: "GET",
    };

    const req = https.request(options, (res) => {
      res.on("data", (d) => {
        json += d;
      });

      res.on("end", () => {
        resolve(json);
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });

  return promise;
};

export const parseChannelName = (name: string) =>
  name.split(":").pop()?.replace(/ */, "").toLowerCase() || "";

export const parseCountryFromChannelName = (name: string) => {
  const countryMatches = name.match(/^ *?(?<country>.*){2,2} *?:.*$/g);
  const country = countryMatches?.groups?.country;

  if (country) {
    return country.trim().toLowerCase();
  }

  return "unpopulated";
};

export const parseIdFromChannelName = (name: string) => {
  const nameMatches = name.match(/(?<para>\(.*\))/g);

  if (nameMatches) {
    return nameMatches.map((m) => m.replace(/[\W_]+/g, "").toLowerCase());
  }

  return [];
};

export const saveJson = async (filename: string, data: unknown) => {
  if (!data) {
    Logger.info(`[saveJson]: ${filename} cannot save with empty data`);
    return;
  }

  return await fs.writeFile(filename, JSON.stringify(data, null, 2));
};

export const getJson = async (filename: string) => {
  return await fs.readFile(filename, "utf8");
};

const XMLTV_TIME_AHEAD_MILLI =
  parseInt(process.env.XMLTV_TIME_AHEAD_SECONDS as string) * 1000;
const XMLTV_TIME_BEHIND_MILLI =
  parseInt(process.env.XMLTV_TIME_BEHIND_SECONDS as string) * 1000;

export const filterProgrammeByDate = (programme: { "@_start": string; }) => {
  const { year, month, day, hour, minute, second } = parseXmlDate(
    programme["@_start"]
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
