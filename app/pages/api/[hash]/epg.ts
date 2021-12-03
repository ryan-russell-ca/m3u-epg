import {
  document2Xml,
  mapChannel,
  mapProgramme,
} from '@/api-lib/common/functions';
import { XMLTVChannelModel, XMLTVProgrammeModel } from '@/api-lib/db';
import UserPlaylistModel from '@/api-lib/db/userPlaylistSchema';
import { NextApiRequest, NextApiResponse } from 'next';
import { XML_PARSE_OPTIONS } from '@/api-lib/objects/files/XMLTVList';
import { Types } from 'mongoose';

const epg = async (req: NextApiRequest, res: NextApiResponse) => {
  const hash = req.query.hash as string;

  if (!hash) {
    res.status(401).end();
    return;
  }

  const playlist = await UserPlaylistModel.findOne({
    user: new Types.ObjectId(hash),
  }).populate('channels.details');

  if (!playlist) {
    return res.status(404).end();
  }

  const playlistChannelTvgIds = playlist.channels.reduce<string[]>(
    (acc, { details }) => {
      if (!details.tvgId) {
        return acc;
      }

      acc.push(details.tvgId);
      return acc;
    },
    []
  );

  const channel = await XMLTVChannelModel.find({
    '@_id': playlistChannelTvgIds,
  });

  const programme = await XMLTVProgrammeModel.find({
    '@_channel': playlistChannelTvgIds,
  });

  const data = `
    <?xml version="1.0" encoding="UTF-8" ?>
    <tv>
      ${document2Xml(channel.map(mapChannel), 'channel', XML_PARSE_OPTIONS)}
      ${document2Xml(
        programme.map(mapProgramme),
        'programme',
        XML_PARSE_OPTIONS
      )}
    </tv>
  `.trim();

  res.setHeader('Content-Type', 'application/xml');
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
