type GroupDictionary = {
  [key: string]: ChannelInfoModel[];
};

export const createIdDictionary = (groups: ChannelInfoModel[]) => {
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
