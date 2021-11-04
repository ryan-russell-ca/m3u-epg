type GroupDictionary = {
  [key: string]: M3U.ChannelInfoModel[];
};

export const createIdDictionary = (groups: M3U.ChannelInfoModel[]) => {
  return groups.reduce<GroupDictionary>(
    (acc, group) => {
      if (!acc[group.name]) {
        acc[group.name] = [];
      }

      acc[group.name].push(group);

      return acc;
    },
    {}
  );
};
