import StatusCodes from "http-status-codes";
import { Request, Response } from "express";
import ChannelManager from "@objects/ChannelManager";
import { getJson } from "@shared/functions";

const { OK } = StatusCodes;

const channelManager = new ChannelManager();

export const getPlaylist = async (req: Request, res: Response) => {
  // if (req.query.json) {
  //   return res.status(OK).json(m3u.json());
  // }

  res.contentType("text");
  await channelManager.load();
  return res.status(OK).send(channelManager.getM3U());
};

export const getEpg = async (req: Request, res: Response) => {
  await channelManager.load();

  res.contentType("xml");
  return res.status(OK).send(channelManager.getEPG());
};

export const getChannelInfo = async (req: Request, res: Response) => {
  await channelManager.load();
  return res.status(OK).json(
    channelManager.getInfo({
      name: req.query.name as string,
      id: req.query.id as string,
      formatted: req.query.formatted === "true",
      listAll: req.query.listAll === "true",
    })
  );
};

export const sandbox = async (req: Request, res: Response) => {
  const GENERATED_MAPPINGS_FILE = process.env.GENERATED_MAPPINGS_FILE as string;
  try {
    const json = await getJson(GENERATED_MAPPINGS_FILE);
    const customMappings = JSON.parse(json);
    const filtered = Object.values(customMappings).filter(
      (m: any) => m.confirmed
    );
    return res.status(OK).send("<pre>" + JSON.stringify(filtered.reduce<any>((acc, f: any) => {
      acc[f.url] = f;
      return acc;
    }, {}), null, 2) + "</pre>");
  } catch (err) {
    console.log("[M3UFile]: Custom Mappings JSON is empty");
  }
  return res.status(OK).send("<pre></pre>");
};
