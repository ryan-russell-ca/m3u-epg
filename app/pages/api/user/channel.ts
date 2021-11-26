import { auths } from '@/api-lib/middlewares';
import { ncOpts } from '@/api-lib/nc';
import { UserModel } from '@/types/user';
import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';

const handler = nc(ncOpts);

handler.use(...auths);

handler.get(async (req: NextApiRequest & { user: UserModel }, res: NextApiResponse) => {
  if (!req.user) return res.json({ channels: [] });

  return res.json({ channels: [] });
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
