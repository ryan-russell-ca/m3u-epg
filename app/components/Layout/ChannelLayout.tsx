import { SideMenu } from '@/page-components/Menu';
import Head from 'next/head';
import React from 'react';
import styles from './ChannelLayout.module.scss';

const Layout: React.FunctionComponent = ({ children }) => {
  return (
    <>
      <Head>
        <title>IPTV App</title>
        <meta
          key="viewport"
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="description" content="" />
        <meta property="og:title" content="IPTV" />
        <meta property="og:description" content="" />
        <meta property="og:image" content="" />
      </Head>
      <div className={styles['channel-container']}>
        <div className={styles['channel-container-menu']}>
          <SideMenu />
        </div>
        <div className={styles['channel-container-content']}>{children}</div>
      </div>
    </>
  );
};

export default Layout;
