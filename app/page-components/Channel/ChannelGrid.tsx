import ReactPaginate from 'react-paginate';
import React, { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import styles from './ChannelGrid.module.scss';
import { ChannelInfoModel, ChannelOrderModel } from '@/types/m3u';
import { GetChannelsPayload } from '@/types/api';
import withLoader from '@/components/HOC/Loading';
import { Input } from '@/components/Input';
import { useCurrentUser } from '../User/UserProvider';
import { ClickableChannels } from '@/components/Channel';

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

const setParams = (uri: string, page: number, size: number, search: string) => {
  const url = new URL('https://localhost' + uri);

  url.searchParams.set('page', page.toString());
  url.searchParams.set('size', size.toString());
  url.searchParams.set('search', search);

  return url.pathname + url.search;
};

// const getParams = (url: string) => {
//   const _url = new URL('https://localhost' + url);

//   return {
//     page: parseInt(_url.searchParams.get('page') || '1'),
//     size: parseInt(_url.searchParams.get('size') || '20'),
//     search: _url.searchParams.get('search') || '',
//   };
// };

const ChannelGrid = ({
  channels: { channels, totalItems, page, size, search },
  onLoadingStart,
  onLoadingComplete,
}: {
  channels: GetChannelsPayload;
  onLoadingStart: () => void;
  onLoadingComplete: () => void;
}) => {
  const { userChannels, addChannels, removeChannels } = useCurrentUser();
  const router = useRouter();

  const isSelected = useCallback(
    (channel: ChannelInfoModel) =>
      userChannels &&
      !!userChannels.find(
        (uc: ChannelOrderModel) => channel.url === uc.details.url
      ),
    [userChannels]
  );

  const handlePageClick = useCallback(
    ({ selected }) => {
      const page = selected + 1;
      router.push(setParams(router.route, page, size, search));
    },
    [search, size, router]
  );

  const handleSearchChange = debounce(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.persist();
      router.push(setParams(router.route, page, size, e.target.value));
    },
    700
  );

  const toggleChannel = useCallback(
    async (channel: ChannelInfoModel) => {
      try {
        onLoadingStart();

        if (isSelected(channel)) {
          await removeChannels(channel);
          toast.success(`You have removed channel ${channel.name}`);
        } else {
          await addChannels(channel);
          toast.success(`You have added channel ${channel.name}`);
        }
      } catch (e) {
        toast.error(`${channel.name} could not be added`);
      } finally {
        onLoadingComplete();
      }
    },
    [addChannels, isSelected, onLoadingComplete, onLoadingStart, removeChannels]
  );

  const selectedUrls = (userChannels || []).map(({ details }) => details.url);

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

      <ClickableChannels
        channels={channels}
        selectedUrls={selectedUrls}
        onClick={toggleChannel}
      />

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

export default withLoader<{ channels: GetChannelsPayload }>(ChannelGrid);
