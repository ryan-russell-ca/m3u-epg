import ReactPaginate from 'react-paginate';
import React, { useCallback } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import styles from './ChannelSidebar.module.scss';
import { ChannelCard } from '@/components/Card';
import { ChannelInfoModel } from '@/types/m3u';
import { useChannels } from '@/lib/user';
import { GetChannelsPayload } from '@/types/api';
import withLoader from '@/components/HOC/Loading';
import { Input } from '@/components/Input';
import { fetcher } from '@/lib/fetch';
import { GetServerSideProps } from 'next';

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

const ChannelSidebar = ({
  data: { channels, totalItems, page, size, search },
  onLoadingStart,
  onLoadingComplete,
}: {
  data: GetChannelsPayload;
  onLoadingStart: () => void;
  onLoadingComplete: () => void;
}) => {
  const { data, mutate } = useChannels();
  const router = useRouter();

  const userChannels = data?.channels as ChannelInfoModel[];

  const isSelected = useCallback(
    (channel: ChannelInfoModel) =>
      userChannels &&
      !!userChannels.find((uc: ChannelInfoModel) => channel.url === uc.url),
    [userChannels]
  );

  const handlePageClick = useCallback(
    ({ selected }) => {
      const page = selected + 1;
      // router.push(setParams(router.route, page, size, search));
    },
    [search, size, router]
  );

  const handleSearchChange = debounce(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.persist();
      // router.push(setParams(router.route, page, size, e.target.value));
    },
    700
  );

  const toggleChannel = useCallback(
    async (channel: ChannelInfoModel) => {
      try {
        try {
          onLoadingStart();

          await fetcher('/api/user/playlist', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channels: [channel],
              op: isSelected(channel) ? 'remove' : 'add',
            }),
          });

          mutate({ channels: [...channels, channel] }, false);

          toast.success(
            `You have ${isSelected(channel) ? 'removed' : 'added'} channel ${
              channel.name
            }`
          );
        } catch (e) {
          toast.error(`${channel.name} could not be added`);
        } finally {
          onLoadingComplete();
        }

        await mutate(
          {
            channels: isSelected(channel)
              ? userChannels.filter((ch) => ch.url !== channel.url)
              : [...userChannels, channel],
          },
          false
        );
      } catch (e) {
        toast.error(e.message);
      }
    },
    [
      channels,
      isSelected,
      mutate,
      onLoadingComplete,
      onLoadingStart,
      userChannels,
    ]
  );

  return (
      <div className={styles['channels-container']}>
        <div className={styles['channels-controls']}>
          <Input
            className={styles['channels-container-input']}
            placeholder="Filter Channels"
            htmlType="input"
            ariaLabel="Filter Channels"
            onChange={handleSearchChange}
            defaultValue={search}
          />
          <ReactPaginate
            initialPage={page}
            breakLabel="..."
            nextLabel=">"
            onPageChange={handlePageClick}
            pageRangeDisplayed={3}
            pageCount={Math.ceil(totalItems / size)}
            previousLabel="<"
            marginPagesDisplayed={2}
            activeLinkClassName={styles['container-pagination-link-selected']}
            containerClassName={styles['container-pagination']}
            pageLinkClassName={styles['container-pagination-link']}
            nextLinkClassName={styles['container-pagination-link']}
            previousLinkClassName={styles['container-pagination-link']}
          />
        </div>

        <div className={styles['container']}>
          {channels.map((channel, i) => (
            <div
              key={`tvgId-${i}`}
              className={clsx(styles['container-item'], {
                [styles['container-item-selected']]: isSelected(channel),
              })}
            >
              <ChannelCard toggleChannel={toggleChannel} channel={channel} />
            </div>
          ))}
        </div>

        <div className={styles['channels-controls']}>
          <ReactPaginate
            initialPage={page}
            breakLabel="..."
            nextLabel=">"
            onPageChange={handlePageClick}
            pageRangeDisplayed={3}
            pageCount={Math.ceil(totalItems / size)}
            previousLabel="<"
            marginPagesDisplayed={2}
            activeLinkClassName={styles['container-pagination-link-selected']}
            containerClassName={styles['container-pagination']}
            pageLinkClassName={styles['container-pagination-link']}
            nextLinkClassName={styles['container-pagination-link']}
            previousLinkClassName={styles['container-pagination-link']}
          />
        </div>
      </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const isServer = !!ctx.req;
  const uri = `channel?page=0&size=20`;

  if (isServer) {
    const res = await fetch(`http://iptv-app:3000/api/${uri}`);
    const data = await res.json();
    return { props: { data } };
  }

  const res = await fetch(
    `http://${location.hostname}:${location.port}/api/${uri}`
  );
  const data = await res.json();

  return { props: { data } };
};

export default withLoader(ChannelSidebar);
