import React from 'react';
import { GetServerSideProps } from 'next';
import { ChannelGrid } from '@/page-components/Channel';
import { ChannelLayout, Container } from '@/components/Layout';
import { findUserByUsername } from '@/api-lib/db';
import { GetChannelGroupsPayload, GetChannelsPayload } from '@/types/api';
import { UserProvider } from '@/page-components/User/UserProvider';
import {
  getServerSidePropsFetch,
  redirectToLogin,
} from '@/api-lib/common/functions';

const Iptv = ({
  channels,
  groups,
}: {
  channels: GetChannelsPayload;
  groups: GetChannelGroupsPayload;
}) => (
  <UserProvider>
    <ChannelLayout groups={groups}>
      <Container>
        <ChannelGrid channels={channels} />
      </Container>
    </ChannelLayout>
  </UserProvider>
);

export const getServerSideProps: GetServerSideProps = async ({
  req,
  params,
  query,
}) => {
  const user = await findUserByUsername(params?.username as string);

  if (!user) {
    return redirectToLogin();
  }

  const group = (query.group as string) || '';
  const page = (parseInt(query.page as string) || 1) - 1;
  const size = parseInt(query.size as string) || 100;
  const search = (query.search as string) || '';
  const uri = `/channel?page=${page}&size=${size}&search=${search}&group=${group}`;

  const get = getServerSidePropsFetch(!!req);
  const channelResponse = await get(uri);
  const channels = await channelResponse.json();
  const groupResponse = await get('/groups');
  const groups = await groupResponse.json();

  return { props: { channels, groups } };
};

export default Iptv;
