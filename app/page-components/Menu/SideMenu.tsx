import { UrlObject } from 'url';
import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './SideMenu.module.scss';
import { GetChannelGroupsPayload } from '@/types/api';

const renderItem = (href: string | UrlObject, name: string, current: string, key?: string) =>
  href === current ? (
    <div
      className={clsx(
        styles['side-menu-item'],
        styles['side-menu-item-selected']
      )}
    >
      {name}
    </div>
  ) : (
    <Link href={href} key={key}>
      <a className={styles['side-menu-item']}>
        {name}
      </a>
    </Link>
  );
const SideMenu = ({ groups }: { groups: GetChannelGroupsPayload }) => {
  const router = useRouter();

  return (
    <div className={styles['side-menu-container']}>
      {renderItem('/iptv/playlist', 'Playlist', router.pathname)}
      <div className={styles['side-menu-item-header']}>Browse Channels</div>
      {renderItem('/iptv', 'All Channels', router.pathname)}
      {groups.groups.map((group) =>
        renderItem(
          {
            pathname: '/iptv/channels/[group]',
            query: { group: group.slug },
          },
          group.name,
          router.pathname,
          group.slug,
        )
      )}
    </div>
  );
};

export default SideMenu;
