import { ChannelInfoModel } from '../m3u';

export interface GetChannelsPayload {
  channels: ChannelInfoModel[];
  page: number;
  size: number;
  search: string;
  totalItems: number;
}
