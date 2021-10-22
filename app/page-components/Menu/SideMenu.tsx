import clsx from 'clsx';
import Link from 'next/link';
import styles from './SideMenu.module.scss';
import { GetChannelGroupsPayload } from '@/types/api';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useCurrentUser } from '../User/UserProvider';

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
  const { signOut } = useCurrentUser();
  
    const onSignOut = useCallback(async () => {
      try {
        await signOut();
        toast.success('You have been signed out');
      } catch (e) {
        toast.error(e.message);
      }
    }, [signOut]);

  return (
    <div className={styles['side-menu-container']}>
      <div className={styles['side-menu-item-header']}>Manage</div>
      {renderItem(
        '/iptv/playlist',
        'Playlist',
        '/iptv/playlist' === router.pathname
      )}
      <a href="/login" onClick={onSignOut} className={styles['side-menu-item']}>
        Sign Out
      </a>
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
