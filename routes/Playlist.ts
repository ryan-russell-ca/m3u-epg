import StatusCodes from "http-status-codes";
import { Request, Response } from "express";
import M3U from "@objects/m3u";
import EPG from "@objects/epg";
import IPTVOrgCodes from "@objects/files/IPTVOrgCode";

const { OK } = StatusCodes;

export const getPlaylist = async (req: Request, res: Response) => {
  const m3u = await M3U.importFile();
  const channels = new EPG();
  await channels.load();

  if (req.query.json) {
    return res.status(OK).json(m3u.json());
  }

  const final = M3U.json2M3U(channels.addTvgIds(m3u.json()));
  res.contentType("text");

  return res.status(OK).send(final);
};

export const getMatches = async (req: Request, res: Response) => {
  const m3u = await M3U.importFile();
  const channels = new EPG();
  await channels.load();

  if (req.query.json) {
    return res.status(OK).json(m3u.json());
  }

  res.contentType("text");
  return res
    .status(OK)
    .send(JSON.stringify(channels.addTvgIds(m3u.json()), null, 2));
};

export const getEpg = async (req: Request, res: Response) => {
  const m3u = await M3U.importFile();
  const channels = new EPG();
  await channels.load();

  channels.addTvgIds(m3u.json());

  res.contentType("xml");
  return res.status(OK).send(await channels.getGuides());
};

export const sandbox = async (req: Request, res: Response) => {
  const codes = new IPTVOrgCodes();
  await codes.load();
  const matches = codes.match({ name: "ctv montreal", formatted: true });
  // console.log(matches);
  // res.contentType("xml");
  // return res.status(OK).send(await channels.getGuides());
  return res
    .status(OK)
    .send("<pre>" + JSON.stringify(matches, null, 2) + "</pre>");
};
