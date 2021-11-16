export const updateChannel = async (channel: M3U.ChannelInfoDocument, updates: any) => {
  return await channel.update(updates);
};
