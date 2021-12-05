import { NextApiRequest, NextApiResponse } from 'next';
import { PlaylistChannelGroupModel } from '@/api-lib/db/playlistSchema';

const routes = async (req: NextApiRequest, res: NextApiResponse) => {
  const page = parseInt(req.query.page as string) || 0;
  const size = parseInt(req.query.size as string) || 100;
  const search = req.query.search as string;
  
  const groups = await PlaylistChannelGroupModel.find(
    search ? { name: new RegExp(search, 'gi') } : {},
    {},
    { limit: size, skip: page * size }
  );

  const totalItems = await PlaylistChannelGroupModel.count(
    search ? { name: new RegExp(search, 'gi') } : {}
  );

  res.status(200).json({
    groups: groups.map((c) => c.toJSON()),
    page,
    size,
    totalItems,
    search,
  });
};

export default routes;
