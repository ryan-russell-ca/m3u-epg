import Head from 'next/head';
import React from 'react';
import Footer from './Footer';
import styles from './Layout.module.scss';
import Nav from './Nav';

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
      <Nav />
      <main className={styles['container-layout']}>{children}</main>
      <Footer />
    </>
  );
};

export default Layout;
