type GroupDictionary = {
  [key: string]: M3U.Group[];
};

export const createIdDictionary = (groups: M3U.Group[]) => {
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
