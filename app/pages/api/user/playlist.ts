import UserPlaylistModel from '@/api-lib/db/userPlaylistSchema';
import { auths } from '@/api-lib/middlewares';
import { ncOpts } from '@/api-lib/nc';
import { UserModel } from '@/types/user';
import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';

const handler = nc(ncOpts);

handler.use(...auths);

handler.get(
  async (req: NextApiRequest & { user: UserModel }, res: NextApiResponse) => {
    if (!req.user) return res.json({ channels: [] });

    const playlist = await UserPlaylistModel.findOne({ user: req.user }).populate(
      'channels'
    );

    return res.json({
      channels: playlist?.channels,
      datae: playlist?.date,
    });
  }
);

handler.put(async (req: NextApiRequest & { user: UserModel }, res: NextApiResponse) => {
  if (!req.user) return res.json({ channels: [] });

  const channels = req.body.channels;

  await UserPlaylistModel.updateOne(
    { user: req.user },
    { user: req.user, $push: { channels } },
    { upsert: true, setDefaultsOnInsert: true }
  ).populate('channels');

  return res.status(200).send('OK');
});

export const config = {
  api: {
    bodyParser: true,
  },
};

export default handler;
