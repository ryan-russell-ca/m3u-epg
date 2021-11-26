import React from 'react';
import { GetServerSideProps } from 'next';
import { Channel } from '@/page-components/Channel';
import { Container } from '@/components/Layout';
import { findUserByUsername } from '@/api-lib/db';
import { GetChannelsPayload } from '@/types/api';

const Home = ({ data }: { data: GetChannelsPayload }) => (
  <Container>
    <Channel data={data} />
  </Container>
);

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const user = await findUserByUsername(ctx.params?.username as string);

  if (!user) {
    return {
      redirect: {
        destination: `/login`,
        permanent: false,
      },
    };
  }

  const isServer = !!ctx.req;
  const page = parseInt(ctx.query.page as string) || 1;
  const size = parseInt(ctx.query.size as string) || 100;
  const search = parseInt(ctx.query.search as string) || '';
  const uri = `channel?page=${page - 1}&size=${size}&search=${search}`;

  if (isServer) {
    const res = await fetch(`http://iptv-app:3000/api/${uri}`);
    const data = await res.json();
    return { props: { data } };
  }

  const res = await fetch(
    `http://${location.hostname}:${location.port}/api/${uri}`
  );
  const data = await res.json();

  return { props: { data } };
};

export default Home;
