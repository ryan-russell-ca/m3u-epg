import { ChannelInfoModel, ChannelOrderModel } from '../m3u';

export interface GetChannelsPayload {
  channels: ChannelInfoModel[];
  page: number;
  size: number;
  search: string;
  totalItems: number;
}

export interface GetPlaylistChannelsPayload {
  channels: ChannelOrderModel[];
  page: number;
  size: number;
  search: string;
  totalItems: number;
}
