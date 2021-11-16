import { table } from 'table';
import Question from '../helpers/Question';
import { createBackupConfirmed } from '../helpers/File';
import { updateChannel } from '../helpers/Channel';

enum ConfirmationActions {
  Confirm = 1,
  Skip = 2,
  Edit = 3,
  Save = 4,
  Quit = 5,
}

export const ConfirmChannel = async (channel: M3U.ChannelInfoDocument): Promise<void> => {
  
  const { action } = await Question({
    type: 'list',
    name: 'action',
    loop: false,
    choices: [
      { name: 'Confirm & Save', value: ConfirmationActions.Confirm },
      { name: 'Skip', value: ConfirmationActions.Skip },
      { name: 'Edit', value: ConfirmationActions.Edit },
      { name: 'Save', value: ConfirmationActions.Save },
      { name: 'Quit', value: ConfirmationActions.Quit },
    ],
    default: 1,
    message: table(
      Object.entries({
        confidence: channel.confidence,
        confirmed: channel.confirmed,
        country: channel.country,
        group: channel.group,
        logo: channel.logo,
        originalName: channel.originalName,
        name: channel.name,
        tvgId: channel.tvgId,
      })
    ),
  });

  switch (action) {
    case 1:
      channel.set({ confirmed: true });
      await channel.save();
      break;
    case 2:
      break;
    case 3:
      const updates = await EditChannel(channel);
      await updateChannel(channel, {
        confirmed: true,
        confidence: 0,
        ...updates,
      });
      break;
    case 4:
      await createBackupConfirmed();
      return ConfirmChannel(channel);
    case 5:
      return;
    default:
      break;
  }
};

const EditChannel = async (channel: M3U.ChannelInfoDocument) => {
  const channelJson = {
    name: channel.name,
    tvgId: channel.tvgId,
    logo: channel.logo,
  } as Record<string, string | null>;

  for (const name of ['name', 'tvgId', 'logo']) {
    const { value } = await Question({
      type: 'input',
      name: 'value',
      default: channelJson[name],
      message: () => '\n' + `${name}?`,
    }, false);

    channelJson[name] = value;
  }

  return channelJson;
};

