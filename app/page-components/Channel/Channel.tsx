import ReactPaginate from 'react-paginate';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import styles from './Channel.module.scss';
import { ChannelCard } from '@/components/Card';
import { ChannelInfoModel } from '@/types/m3u';
import { useChannels } from '@/lib/user';
import { GetChannelsPayload } from '@/types/api';
import withLoader from '@/components/HOC/Loading';
import { Input } from '@/components/Input';
import { fetcher } from '@/lib/fetch';

const setParams = (uri: string, page: number, size: number, search: string) => {
  const url = new URL('https://localhost' + uri);

  url.searchParams.set('page', page.toString());
  url.searchParams.set('size', size.toString());
  url.searchParams.set('search', search);

  return url.pathname + url.search;
};

const getParams = (url: string) => {
  const _url = new URL('https://localhost' + url);

  return {
    page: parseInt(_url.searchParams.get('page') || '1'),
    size: parseInt(_url.searchParams.get('size') || '20'),
    search: _url.searchParams.get('search') || '',
  };
};

const Channel = ({
  data: { channels, totalItems, page, size, search },
  isLoading,
  onLoadingStart,
onLoadingComplete,
}: {
  data: GetChannelsPayload;
  isLoading: boolean;
  onLoadingStart: () => void;
  onLoadingComplete: () => void;
}) => {
  const { data, mutate } = useChannels();
  const router = useRouter();

  const userChannels = data?.channels;

  const isSelected = useCallback(
    (channel: ChannelInfoModel) =>
      userChannels &&
      !!userChannels.find((uc: ChannelInfoModel) => channel.url === uc.url),
    [userChannels]
  );

  const handlePageClick = useCallback(
    ({ selected }) => {
      const page = selected + 1;
      router.push(setParams(router.route, page, size, search));
    },
    [search, size, router]
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
            }),
          });
          mutate({ channels: [...channels, channel] }, false);
          toast.success(`You have added channel ${channel.name}`);
        } catch (e) {
          toast.error(`${channel.name} could not be added`);
        } finally {
          onLoadingComplete();
        }

        await mutate(
          {
            channels: [...userChannels, channel],
          },
          false
        );
      } catch (e) {
        toast.error(e.message);
      }
    },
    [mutate, userChannels]
  );

  return (
    <div className={styles['main']}>
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

      <Input
        label="Filter Channels"
        htmlType="input"
        ariaLabel="Filter Channels"
      />

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
  );
};

export default withLoader(Channel);
