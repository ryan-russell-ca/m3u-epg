import StatusCodes from "http-status-codes";
import { Request, Response } from "express";
import ChannelManager from "@objects/ChannelManager";
import { getJson } from "@shared/functions";
import Logger from "@shared/Logger";

const { OK } = StatusCodes;

const channelManager = new ChannelManager();

export const getPlaylist = async (req: Request, res: Response) => {
  // if (req.query.json) {
  //   return res.status(OK).json(m3u.json());
  // }

  const refresh = req.query.refresh === "true";

  await channelManager.load(refresh);

  res.contentType("text");
  return res.status(OK).send(await channelManager.getM3U());
};

export const getEpg = async (req: Request, res: Response) => {
  await channelManager.load();

  res.contentType("xml");
  return res.status(OK).send(channelManager.getXMLTV());
};

export const getChannelInfo = async (req: Request, res: Response) => {
  await channelManager.load();
  
  const filters: M3U.ChannelInfoFilters = {
    group: req.query.group?.toString(),
    tvgId: req.query.tvgId?.toString(),
    name: req.query.name?.toString(),
    originalName: req.query.originalName?.toString(),
    url: req.query.url?.toString(),
    country: req.query.country?.toString(),
    definition: req.query.definition?.toString(),
  };

  // return res.status(OK).json(channelManager.getChannelJSON(filters));
};

export const getMatches = async (req: Request, res: Response) => {
  await channelManager.load();
  // return res.status(OK).json(
  //   channelManager.getInfo({
  //     name: req.query.name as string,
  //     id: req.query.id as string,
  //     formatted: req.query.formatted === "true",
  //     listAll: req.query.listAll === "true",
  //   })
  // );
};

export const sandbox = async (req: Request, res: Response) => {
  const GENERATED_MAPPINGS_FILE = process.env.GENERATED_MAPPINGS_FILE as string;
  try {
    const json = await getJson(GENERATED_MAPPINGS_FILE);
    const customMappings = JSON.parse(json);
    const filtered = Object.values(customMappings).filter(
      (m: any) => m.confirmed
    );
    return res.status(OK).send(
      "<pre>" +
        JSON.stringify(
          filtered.reduce<any>((acc, f: any) => {
            acc[f.url] = f;
            return acc;
          }, {}),
          null,
          2
        ) +
        "</pre>"
    );
  } catch (error) {
    Logger.info("[M3UFile]: Custom Mappings JSON is empty");
  }
  return res.status(OK).send("<pre></pre>");
};
