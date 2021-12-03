import React, { useCallback } from 'react';
import styles from './ChannelPlaylist.module.scss';
import withLoader from '@/components/HOC/Loading';
import { useCurrentUser } from '../User/UserProvider';
import { SortableChannels } from '@/components/Channel';
import { ChannelOrderModel } from '@/types/m3u';
import toast from 'react-hot-toast';

export const debounce = (
  func: (e: React.ChangeEvent<HTMLInputElement>) => void,
  timeout = 300
) => {
  let timer: NodeJS.Timeout;
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(e);
    }, timeout);
  };
};

const ChannelPlaylist = ({
  onLoadingStart,
  onLoadingComplete,
}: {
  onLoadingStart: () => void;
  onLoadingComplete: () => void;
}) => {
  const { userChannels, orderChannels } = useCurrentUser();

  const handleSort = useCallback(
    async ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
      try {
        onLoadingStart();

        await orderChannels(oldIndex, newIndex);
        toast.success(`You have move #${oldIndex + 1} to #${newIndex + 1}`);
      } catch (e) {
        toast.error(`Could not move channels`);
      } finally {
        onLoadingComplete();
      }
    },
    [onLoadingComplete, onLoadingStart, orderChannels]
  );

  const { ordered, unordered } = (userChannels || []).reduce<{
    ordered: ChannelOrderModel[];
    unordered: ChannelOrderModel[];
  }>(
    (acc, channel) => {
      if (channel.order) {
        acc.ordered.push(channel);
      } else {
        acc.unordered.push(channel);
      }

      return acc;
    },
    {
      ordered: [],
      unordered: [],
    }
  );

  return (
    <div className={styles['channels-container']}>
      <SortableChannels channels={ordered} onSort={handleSort} />
      <SortableChannels channels={unordered} onSort={handleSort} />
    </div>
  );
};

export default withLoader(ChannelPlaylist);
