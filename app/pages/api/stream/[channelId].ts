import urlExist from 'url-exist';
import { PlaylistChannelModel } from '@/api-lib/db';
import { NextApiRequest, NextApiResponse } from 'next';
import Logger from '@/api-lib/modules/Logger';

const checkAndForward = async (url: string, res: NextApiResponse) => {
  const running = await urlExist(url);

  if (running) {
    res.writeHead(302, { Location: url });
    res.end();
    return true;
  }

  return false;
};

const stream = async (req: NextApiRequest, res: NextApiResponse) => {
  const id = req.query.channelId as string;
  const channel = await PlaylistChannelModel.findById(id);

  if (!channel) {
    res.writeHead(404);
    res.end();
    return;
  }

  if (await checkAndForward(channel.url, res)) {
    Logger.info(`Original URL success for: ${channel.name} (${channel.id})`);
    return;
  }

  Logger.info(`Original URL failed for: ${channel.name} (${channel.id})`);

  const channels = await PlaylistChannelModel.find({ tvgId: channel.tvgId });
  for (const ch of channels) {
    if (await checkAndForward(ch.url, res)) {
      Logger.info(`Backup URL success for: ${ch.name} (${ch.id})`);
      return;
    }
    Logger.info(`Backup URL failed for: ${ch.name} (${ch.id})`);
  }

  res.writeHead(404);
  res.end();
};

export default stream;
