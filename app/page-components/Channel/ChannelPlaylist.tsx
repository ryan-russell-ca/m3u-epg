import React, { useCallback } from 'react';
import styles from './ChannelPlaylist.module.scss';
import withLoader from '@/components/HOC/Loading';
import { useCurrentUser } from '../User/UserProvider';
import { SortableChannels } from '@/components/Channel';
import { ChannelInfoModel, ChannelOrderModel } from '@/types/m3u';
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
  const { userChannels, orderChannels, removeChannels } = useCurrentUser();

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

  const handleRemove = useCallback(
    async (channel: ChannelInfoModel) => {
      try {
        onLoadingStart();

        await removeChannels(channel);
        toast.success(`You have removed channel ${channel.name}`);
      } catch (e) {
        toast.error(`${channel.name} could not be added`);
      } finally {
        onLoadingComplete();
      }
    },
    [onLoadingComplete, onLoadingStart, removeChannels]
  );

  return (
    <div className={styles['channels-container']}>
      <SortableChannels
        onRemove={handleRemove}
        channels={userChannels || []}
        onSort={handleSort}
      />
    </div>
  );
};

export default withLoader(ChannelPlaylist);
