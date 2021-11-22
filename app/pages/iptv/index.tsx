import React from 'react';
import { NextPageContext } from 'next';
import { Channel } from '@/page-components/Channel';

const Home = ({ channels }) => (
  <Channel channels={channels} />
)

Home.getInitialProps = async ({ req }: NextPageContext) => {
  const isServer = !!req;

  if (isServer) {
    const res = await fetch('http://iptv-app:3000/api/channel');
    const channels = await res.json();
    return { channels: channels };
  }

  const res = await fetch(
    `http://${location.hostname}:${location.port}/api/channel`
  );
  const channels = await res.json();

  return { channels: channels };
};

export default Home;
