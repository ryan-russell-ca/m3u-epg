import { getJson } from '@/common/functions';
import fs from 'fs/promises';
import MongoConnector from '@/shared/database/Mongo';
import { M3UChannelModel } from '@/shared/database/M3USchema';

const CONFIRMED_MAPPINGS_FILE = process.env.CONFIRMED_MAPPINGS_FILE as string;

export const createBackupConfirmed = async () => {
  const current = await getJson(CONFIRMED_MAPPINGS_FILE);
  const confirmedChannels = JSON.parse(current) as Record<
    string,
    ChannelInfoDocument
  >;

  const channels: ChannelInfoDocument[] = await M3UChannelModel.find({
    confirmed: true,
  });

  const saveChannels = channels.reduce<Record<string, ChannelInfoModel>>(
    (acc, ch) => {
      acc[ch.url] = {
        url: ch.url,
        confirmed: ch.confirmed,
        country: ch.country,
        group: ch.group,
        logo: ch.logo,
        name: ch.name,
        originalName: ch.originalName,
        parsedIds: ch.parsedIds,
        parsedName: ch.parsedName,
        tvgId: ch.tvgId,
        confidence: ch.confidence,
      };
      return acc;
    },
    confirmedChannels
  );

  return await fs.writeFile(
    CONFIRMED_MAPPINGS_FILE,
    JSON.stringify(saveChannels, null, 2)
  );
};
