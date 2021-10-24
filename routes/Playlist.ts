import StatusCodes from "http-status-codes";
import { Request, Response } from "express";
import ChannelManager from "@objects/ChannelManager";

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

export const sandbox = async (req: Request, res: Response) => {
  await channelManager.load();
  return res.status(OK).send("<pre>" + channelManager.getEPG() + "</pre>");
};
