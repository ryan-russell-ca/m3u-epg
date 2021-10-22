import { NextApiRequest, NextApiResponse } from 'next';
import {
  PlaylistChannelGroupModel,
  PlaylistChannelModel,
} from '@/api-lib/db/playlistSchema';

const routes = async (req: NextApiRequest, res: NextApiResponse) => {
  const group = req.query.group as string;
  const page = parseInt(req.query.page as string) || 0;
  const size = parseInt(req.query.size as string) || 100;
  const search = req.query.search as string;

  const channels = await PlaylistChannelModel.find(
    {
      ...(search ? { name: new RegExp(search, 'gi') } : {}),
      ...(group
        ? { group: await PlaylistChannelGroupModel.findOne({ slug: group }) }
        : {}),
    },
    {},
    { limit: size, skip: page * size }
  );

  const totalItems = await PlaylistChannelModel.count({
    ...(search ? { name: new RegExp(search, 'gi') } : {}),
    ...(group ? { group:
      (await PlaylistChannelGroupModel.findOne({ slug: group })) } : {}),
  });

  res.status(200).json({
    channels: channels.map((c) => c.toJSON()),
    page,
    size,
    totalItems,
    search,
  });
};

export default routes;
