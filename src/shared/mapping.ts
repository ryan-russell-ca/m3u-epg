type GroupDictionary = {
  [key: string]: M3U.ChannelInfo[];
};

export const createIdDictionary = (groups: M3U.ChannelInfo[]) => {
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
