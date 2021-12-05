import React from 'react';
import { GetServerSideProps } from 'next';
import { ChannelLayout, Container } from '@/components/Layout';
import { findUserByUsername } from '@/api-lib/db';
import { UserProvider } from '@/page-components/User/UserProvider';
import ChannelPlaylist from '@/page-components/Channel/ChannelPlaylist';
import { getServerSidePropsFetch } from '@/api-lib/common/functions';
import { GetChannelGroupsPayload } from '@/types/api';

const Playlist = ({ groups }: { groups: GetChannelGroupsPayload }) => (
  <UserProvider>
    <ChannelLayout groups={groups}>
      <Container>
        <ChannelPlaylist />
      </Container>
    </ChannelLayout>
  </UserProvider>
);

export const getServerSideProps: GetServerSideProps = async ({ req, params }) => {
  const user = await findUserByUsername(params?.username as string);

  if (!user) {
    return {
      redirect: {
        destination: `/login`,
        permanent: false,
      },
    };
  }

  const get = getServerSidePropsFetch(!!req);
  const groupResponse = await get('/groups');
  const groups = await groupResponse.json();

  return { props: { groups } };
};

export default Playlist;
