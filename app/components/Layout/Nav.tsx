import Link from 'next/link';
import styles from './Nav.module.scss';

const Nav = () => (
  <nav className={styles['container-nav']}>
    <div className={styles['container-nav-content']}>
      <Link href="/">
        <a className={styles.logo}>IPTV</a>
      </Link>
    </div>
  </nav>
);

export default Nav;
