import { NextApiRequest, NextApiResponse } from 'next';
import { PlaylistChannelModel } from '@/api-lib/db/playlistSchema';

const routes = async (req: NextApiRequest, res: NextApiResponse) => {
  const page = parseInt(req.query.page as string) || 0;
  const size = parseInt(req.query.size as string) || 100;
  const search = req.query.search as string;

  const channels = await PlaylistChannelModel.find(
    search ? { name: new RegExp(search) } : {},
    {},
    { limit: size, skip: page * size }
  );

  const totalItems = await PlaylistChannelModel.count();

  res.status(200).json({
    channels: channels.map((c) => c.toJSON()),
    page,
    size,
    totalItems,
    search,
  });
};

export default routes;
