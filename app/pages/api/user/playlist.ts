import { arrayMoveImmutable } from 'array-move';
import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import UserPlaylistModel from '@/api-lib/db/userPlaylistSchema';
import { auths } from '@/api-lib/middlewares';
import { ncOpts } from '@/api-lib/nc';
import { ChannelOrderModel } from '@/types/m3u';
import { UserModel } from '@/types/user';
import { orderMap } from '@/api-lib/common/functions';

type ChannelBody = {
  channels: ChannelOrderModel[];
  op: string;
  to: number;
  from: number;
};

const orderChannels = (channels: ChannelOrderModel[]) => {
  const orders = channels
    .sort((a, b) => {
      if (!a.order) {
        return 1;
      }
      if (!b.order) {
        return -1;
      }
      return a.order - b.order;
    })
    .map(orderMap);

  return orders;
};

const handler = nc(ncOpts);

handler.use(...auths);

handler.get(
  async (req: NextApiRequest & { user: UserModel }, res: NextApiResponse) => {
    if (!req.user) return res.json({ channels: [] });

    const playlist = await UserPlaylistModel.findOne(
      {
        user: req.user,
      },
      null,
      { sort: { 'channels.order': -1 } }
    ).populate('channels.details');

    return res.json({
      channels: playlist?.channels,
      date: playlist?.date,
    });
  }
);

handler.put(
  async (req: NextApiRequest & { user: UserModel }, res: NextApiResponse) => {
    if (!req.user) return res.json({ channels: [] });

    const { channels, op, to, from } = req.body as ChannelBody;

    const playlist = await UserPlaylistModel.findOne({ user: req.user });

    if (op === 'add') {
      await UserPlaylistModel.updateOne(
        { user: req.user },
        {
          user: req.user,
          channels: orderChannels(
            [...(playlist?.channels || []), ...channels]
          ),
        },
        { upsert: true }
      );
    }

    if (op === 'remove') {
      await playlist?.populate('channels.details');
      const removeUrls = channels.map(({ details }) => details.url);

      await UserPlaylistModel.updateOne(
        { user: req.user },
        {
          channels: orderChannels(
            (playlist?.channels || []).filter(
              (ch) => !removeUrls.includes(ch.details.url)
            )
          ),
        }
      );
    }

    if (op === 'order') {
      if (!playlist) {
        return res.status(422).end();
      }

      const channels = [...playlist.channels];

      await UserPlaylistModel.updateOne(
        { user: req.user },
        {
          channels: arrayMoveImmutable(channels, from, to).map(orderMap),
        }
      );
    }

    return res.status(204).send('OK');
  }
);

export const config = {
  api: {
    bodyParser: true,
  },
};

export default handler;
