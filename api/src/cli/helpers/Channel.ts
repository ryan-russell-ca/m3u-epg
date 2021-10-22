export const updateChannel = async (channel: ChannelInfoDocument, updates: any) => {
  return await channel.update(updates);
};
