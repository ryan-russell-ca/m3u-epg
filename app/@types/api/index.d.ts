import { ChannelGroupModel, ChannelInfoModel, ChannelOrderModel } from '../m3u';

export interface GetChannelsPayload {
  channels: ChannelInfoModel[];
  page: number;
  size: number;
  search: string;
  totalItems: number;
}

export interface GetPlaylistChannelsPayload {
  groups: ChannelOrderModel[];
  page: number;
  size: number;
  search: string;
  totalItems: number;
}

export interface GetChannelGroupsPayload {
  groups: ChannelGroupModel[];
  page: number;
  size: number;
  search: string;
  totalItems: number;
}
