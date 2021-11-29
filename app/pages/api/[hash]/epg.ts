import { document2Xml } from '@/api-lib/common/functions';
import { XMLTVChannelModel, XMLTVProgrammeModel } from '@/api-lib/db';
import UserPlaylistModel from '@/api-lib/db/userPlaylistSchema';
import { NextApiRequest, NextApiResponse } from 'next';
import { XML_PARSE_OPTIONS } from '@/api-lib/objects/files/XMLTVList';

const epg = async (req: NextApiRequest, res: NextApiResponse) => {
  const hash = req.query.hash;

  if (!hash) {
    res.status(401).end();
    return;
  }

  const playlist = await UserPlaylistModel.findOne({
    id: req.query.hash,
  }).populate('channels');

  const playlistChannelTvgIds = playlist?.channels.map((c) => c.tvgId );

  const channel = await XMLTVChannelModel.find({
    tvgId: playlistChannelTvgIds,
  });

  const programme = await XMLTVProgrammeModel.find({
    tvgId: playlistChannelTvgIds,
  });
  
  const data = `
    <?xml version="1.0" encoding="UTF-8" ?>
    <tv>
      ${document2Xml(
        channel.map((d) => d.toJSON()),
        'channel',
        XML_PARSE_OPTIONS
      )}
      ${document2Xml(
        programme.map((d) => d.toJSON()),
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
