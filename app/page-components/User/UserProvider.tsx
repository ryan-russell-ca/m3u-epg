import React, { createContext, useContext, useEffect, useRef } from 'react';
import { arrayMoveImmutable } from 'array-move';
import { fetcher } from '@/lib/fetch';
import { useChannels, useCurrentUser as useUser } from '@/lib/user';
import { ChannelInfoModel, ChannelOrderModel } from '@/types/m3u';
import { UserModel } from '@/types/user';

type ChannelDictionary = Record<string, ChannelOrderModel>;

const UserContext = createContext<{
  userDetails: UserModel | undefined;
  userChannels: ChannelOrderModel[] | undefined;
  addChannels: (...channels: ChannelInfoModel[]) => Promise<void>;
  removeChannels: (...channels: ChannelInfoModel[]) => Promise<void>;
  orderChannels: (oldIndex: number, newIndex: number) => Promise<void>;
} | null>(null);

const sortOrder = (a: ChannelOrderModel, b: ChannelOrderModel) => {
  if (!a?.order) {
    return 1;
  }

  if (!b?.order) {
    return -1;
  }
  return a.order - b.order;
};

const putChannels = async (channels: ChannelOrderModel[], op = 'add') => {
  await fetcher('/api/user/playlist', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channels: channels,
      op,
    }),
  });
};

const putOrderChannels = async (oldIndex: number, newIndex: number) => {
  await fetcher('/api/user/playlist', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: oldIndex,
      to: newIndex,
      op: 'order',
    }),
  });
};

const reduceChannels = (channels: ChannelOrderModel[]) =>
  channels.reduce<ChannelDictionary>((acc, channel) => {
    acc[channel.details.url] = channel;
    return acc;
  }, {});

export const UserProvider: React.FunctionComponent<React.ReactNode> = ({
  children,
}) => {
  const { data: { user } = {} } = useUser();
  const { data: { channels } = { channels: [] }, mutate: mutateChannels } =
    useChannels();

  const channelsDictionary = useRef<ChannelDictionary>({});
  const sortedChannels = channels.sort(sortOrder);

  useEffect(() => {
    if (!Object.keys(channelsDictionary.current).length && channels?.length) {
      channelsDictionary.current = reduceChannels(channels);
    }
  }, [channels]);

  const addChannels = async (...addChannels: ChannelInfoModel[]) => {
    const channelsMapped = addChannels.map((channel) => ({
      details: channel,
    }));

    channelsDictionary.current = {
      ...channelsDictionary.current,
      ...reduceChannels(channelsMapped),
    };

    await putChannels(channelsMapped, 'add');

    await mutateChannels(
      {
        channels: Object.values(channelsDictionary.current).sort(sortOrder),
      },
      false
    );
  };

  const removeChannels = async (...removeChannels: ChannelInfoModel[]) => {
    removeChannels.forEach((channel) => {
      delete channelsDictionary.current[channel.url];
    });

    const channelsMapped = removeChannels.map((channel) => ({
      details: channel,
    }));

    await putChannels(channelsMapped, 'remove');

    await mutateChannels(
      {
        channels: Object.values(channelsDictionary.current).sort(sortOrder),
      },
      false
    );
  };

  const orderChannels = async (oldIndex: number, newIndex: number) => {
    await putOrderChannels(oldIndex, newIndex);

    channelsDictionary.current = reduceChannels(arrayMoveImmutable(
      Object.values(channelsDictionary.current),
      oldIndex,
      newIndex
    ));

    await mutateChannels(
      {
        channels: Object.values(channelsDictionary.current).sort(sortOrder),
      }
    );
  };

  const values = {
    userDetails: user,
    userChannels: sortedChannels,
    addChannels,
    removeChannels,
    orderChannels,
  };

  return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};

export const useCurrentUser = () => {
  const context = useContext(UserContext);

  if (!context)
    throw new Error('useCurrentUser must be used inside a `UserProvider`');

  return context;
};
