import clsx from 'clsx';
import Link from 'next/link';
import styles from './SideMenu.module.scss';
import { GetChannelGroupsPayload } from '@/types/api';
import { useRouter } from 'next/router';

const renderItem = (
  href: string,
  name: string,
  active: boolean,
  key?: string
) => {
  return active ? (
    <div
      key={key}
      className={clsx(
        styles['side-menu-item'],
        styles['side-menu-item-selected']
      )}
    >
      {name}
    </div>
  ) : (
    <Link href={href} key={key}>
      <a className={styles['side-menu-item']}>{name}</a>
    </Link>
  );
};

const SideMenu = ({
  groupPayload,
  group,
}: {
  groupPayload: GetChannelGroupsPayload;
  group: string;
}) => {
  const { groups } = groupPayload;
  const router = useRouter();
  
  return (
    <div className={styles['side-menu-container']}>
      {renderItem(
        '/iptv/playlist',
        'Playlist',
        '/iptv/playlist' === router.pathname
      )}
      <div className={styles['side-menu-item-header']}>Browse Channels</div>
      {renderItem('/iptv', 'All Channels', '/iptv' === router.pathname)}
      {groups.map((gr) =>
        renderItem(
          `/iptv/channels/${gr.slug}`,
          gr.name,
          gr.slug === group,
          gr.slug
        )
      )}
    </div>
  );
};

export default SideMenu;
