import { fetcher } from '@/lib/fetch';
import { ChannelOrderModel } from '@/types/m3u';
import { UserModel } from '@/types/user';
import useSWR from 'swr';

export function useCurrentUser() {
  return useSWR<{ user: UserModel | null }>('/api/user', fetcher);
}

export function useChannels() {
  return useSWR<{ channels: ChannelOrderModel[] }>('/api/user/playlist', fetcher);
}

export function useUser(id: string) {
  return useSWR<{ user: UserModel }>(`/api/users/${id}`, fetcher);
}
