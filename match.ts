import M3U from "@shared/m3u";

const allNames = [];

let CONFIG = {
  epgFilename: "./epg.best.json",
  m3uFilename: "./default.m3u",
  outputFilename: "./output.m3u",
  epgDict: {},
  epgDictKeys: [],
};

const setConfig = (overrides) => {
  const epgData = require(overrides.epgFilename || CONFIG.epgFilename);

  epgData.forEach((data, i) => {
    if (Object.keys(data).length !== 4) {
      throw new Error(`Bad EPG file at index ${i}`);
    }
  });

  const epgDict = epgData.reduce((acc, channel) => {
    acc[channel.code] = channel;
    return acc;
  }, {});

  const epgDictKeys = Object.keys(epgDict);

  CONFIG = {
    m3uFilename: CONFIG.m3uFilename,
    outputFilename: overrides.outputFilename || CONFIG.outputFilename,
    prefixes: ["us", "ca", "uk"],
    epgDict,
    epgDictKeys,
    ...overrides,
  };
};

const trimName = (name) => {
  return name
    .toLowerCase()
    .split(/ |f?hd/)
    .join("");
};

const parseName = (name) => {
  const split = name.split(":");

  if (split.length > 1 && CONFIG.prefixes.includes(split[0].toLowerCase())) {
    return split.pop().trim();
  }

  return name.trim();
};

const createOutput = (data) => {
  return '#EXTM3U\n' + data.map(
    (d) => `\
#EXTINF:${d.extInf} group-title="${d.group}" tvg-id="${d.id}" tvg-logo="${d.logo}" ,${d.name}
#EXTGRP:${d.group}
${d.url}`
  ).join("\n");
};

try {
  const flags = {};

  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i = i + 2) {
    if (!/^-[a-z]/.test(args[i]) && !args[i + 1]) {
      throw new Error("Bad arguments");
    }

    if (args[i] === "-f") flags.m3uFile = args[i + 1];
    if (args[i] === "-o") flags.outputFilename = args[i + 1];
  }

  setConfig(flags);

  const m3u = M3U.importFile(CONFIG.m3uFilename);

  console.log(m3u.json());

  const converted = covertM3uJson(data);

  // fs.writeFileSync(CONFIG.outputFilename, createOutput(converted));
} catch (err) {
  console.error(err);
}
