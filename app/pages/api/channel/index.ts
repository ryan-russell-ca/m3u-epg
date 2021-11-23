import { NextApiResponse } from 'next';
import { PlaylistChannelModel } from '@/api-lib/db/playlistSchema';

const routes = async (_req: NextApiResponse, res: NextApiResponse) => {
  const channels = await PlaylistChannelModel.find({}, {}, { limit: 100 });
  res.status(200).json(channels.map((c) => c.toJSON()));
};


export default routes;
