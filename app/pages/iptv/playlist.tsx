import React from 'react';
import { GetServerSideProps } from 'next';
import { ChannelLayout, Container } from '@/components/Layout';
import { findUserByUsername } from '@/api-lib/db';
import { UserProvider } from '@/page-components/User/UserProvider';
import ChannelPlaylist from '@/page-components/Channel/ChannelPlaylist';

const Playlist = () => (
  <UserProvider>
    <ChannelLayout>
      <Container>
        <ChannelPlaylist />
      </Container>
    </ChannelLayout>
  </UserProvider>
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

  return { props: {} };
};

export default Playlist;
