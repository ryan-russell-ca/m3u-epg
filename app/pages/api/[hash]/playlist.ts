
import UserPlaylistModel from '@/api-lib/db/userPlaylistSchema';
import { NextApiRequest, NextApiResponse } from 'next';
import { Types } from 'mongoose';
import { ChannelOrderModel } from '@/types/m3u';

const epg = async (req: NextApiRequest, res: NextApiResponse) => {
  const hash = req.query.hash as string;

  if (!hash) {
    res.status(401).end();
    return;
  }

  const playlist = await UserPlaylistModel.findOne({
    user: new Types.ObjectId(hash),
  }).populate('channels.details');

  if (!playlist?.channels) {
    return res.status(404).end();
  }

  const data = [
    '#EXTM3U ',
    ...playlist.channels
      .map(({ details, order }: ChannelOrderModel) => {
        return [
          `#EXTINF: -1 tvg-chno="${order}" group-title="${details.group}" tvg-id="${details.tvgId}" tvg-logo="${details.logo}", ${details.name}`,
          details.url,
        ].join('\n');
      }),
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', data.length);
  res.status(200);

  return res.send(data);
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default epg;
