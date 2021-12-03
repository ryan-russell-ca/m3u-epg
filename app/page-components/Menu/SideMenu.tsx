import Link from 'next/link';
import styles from './SideMenu.module.scss';

const SideMenu = () => {
  return (
    <div className={styles['side-menu-container']}>
      <Link href="/iptv/playlist">Playlist</Link><br />
      <Link href="/iptv">All Channels</Link>
    </div>
  );
};

export default SideMenu;
