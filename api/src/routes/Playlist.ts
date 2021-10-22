import StatusCodes from 'http-status-codes';
import { Request, Response } from 'express';
import ChannelManager from '@/objects/ChannelManager';
import { ChannelInfoFilters } from '@/shared/@types/m3u';

const { OK } = StatusCodes;

const channelManager = new ChannelManager();

export const getPlaylist = async (req: Request, res: Response) => {
  const refresh = req.query.refresh === 'true';

  await channelManager.load(refresh);

  res.contentType('text');
  return res.status(OK).send(await channelManager.getM3U());
};

export const getEpg = async (req: Request, res: Response) => {
  await channelManager.load();

  res.contentType('xml');
  return res.status(OK).send(channelManager.getXMLTV());
};

export const getChannelInfo = async (req: Request, res: Response) => {
  await channelManager.load();

  const filters: ChannelInfoFilters = {
    group: req.query.group?.toString(),
    tvgId: req.query.tvgId?.toString(),
    name: req.query.name?.toString(),
    originalName: req.query.originalName?.toString(),
    url: req.query.url?.toString(),
    country: req.query.country?.toString(),
    definition: req.query.definition?.toString(),
  };

  return res.status(OK).json(channelManager.getChannelJSON(filters));
};

export const getUnmatched = async (req: Request, res: Response) => {
  await channelManager.load();

  return res.status(OK).json(channelManager.getUnmatchedChannels());
};

export const getMatches = async (req: Request, res: Response) => {
  await channelManager.load();

  const filter = {
    name: req.query.name?.toString(),
    id: req.query.id?.toString(),
  };

  const response = await channelManager.getMatch(filter);

  return res.status(OK).json(response);
};
