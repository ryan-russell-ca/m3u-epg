import M3U from "M3U";

type GroupDictionary = {
  [key: string]: {
    name: string;
    id: string;
    parsedName: string;
    originalName: string;
    country: string | null;
  }[];
};

export const createIdDictionary = (groups: M3U.Group[]) => {
  return groups.reduce<GroupDictionary>(
    (acc, { name, id, parsedName, originalName, country }) => {
      if (!acc[name]) {
        acc[name] = [];
      }

      acc[name].push({
        name,
        id,
        parsedName,
        originalName,
        country,
      });

      return acc;
    },
    {}
  );
};
