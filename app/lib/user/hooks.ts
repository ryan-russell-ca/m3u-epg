import { fetcher } from '@/lib/fetch';
import useSWR from 'swr';

export function useCurrentUser() {
  return useSWR('/api/user', fetcher);
}

export function useChannels() {
  return useSWR('/api/user/channel', fetcher);
}

export function useUser(id: string) {
  return useSWR(`/api/users/${id}`, fetcher);
}
