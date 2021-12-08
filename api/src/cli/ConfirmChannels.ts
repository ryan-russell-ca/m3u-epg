import { M3UChannelModel } from '@/shared/database/M3USchema';
import MongoConnector from '@/shared/database/Mongo';
import { program } from 'commander';
import Inquirer from 'inquirer';
import Question from './helpers/Question';
import { ConfirmChannel } from './questions/Confirmation';

enum EntryActions {
  ViewConfirmed = 1,
  ViewUnconfirmed = 2,
  ViewAll = 3,
  ConfirmChannelsHigh = 4,
  ConfirmChannelsLow = 5,
  ConfirmChannelsUnmatched = 6,
  Quit = 20,
}

const prompt = Inquirer.createPromptModule();

const entry = async () => {
  const { action } = await Question({
    type: 'list',
    name: 'action',
    choices: [
      { name: 'View Confirmed Channels', value: EntryActions.ViewConfirmed },
      {
        name: 'View Unconfirmed Channels',
        value: EntryActions.ViewUnconfirmed,
      },
      { name: 'View All Channels', value: EntryActions.ViewAll },
      {
        name: 'Confirm Channels [High -> Low]',
        value: EntryActions.ConfirmChannelsHigh,
      },
      {
        name: 'Confirm Channels [Low -> High]',
        value: EntryActions.ConfirmChannelsLow,
      },
      {
        name: 'Confirm Channels [Unmatched]',
        value: EntryActions.ConfirmChannelsUnmatched,
      },
    ],
    default: 0,
    message: 'Please select an action:',
  });

  switch (action) {
    case 1:
      await viewChannels(true);
      break;
    case 2:
      break;
    case 3:
      break;
    case 4:
      return confirmChannels(-1);
    case 5:
      return confirmChannels(1);
    case 6:
      return confirmChannels();
    default:
      break;
  }

  return;
};

const viewChannels = async (confirmed?: boolean) => {
  const channels: ChannelInfoDocument[] = await M3UChannelModel.find(
    confirmed !== undefined ? { confirmed } : {}
  );

  // for (const channel of channels) {
  //   const { action } = await prompt({
  //     type: 'list',
  //     name: 'action',
  //     choices: [
  //       { name: 'Confirm & Save', value: ConfirmationActions.Confirm },
  //       { name: 'Skip', value: ConfirmationActions.Skip },
  //       { name: 'Edit', value: ConfirmationActions.Edit },
  //       { name: 'Save', value: ConfirmationActions.Save },
  //       { name: 'Quit', value: ConfirmationActions.Quit },
  //     ],
  //     default: 1,
  //     message: () => '\n' + table(Object.entries(channel.toJSON())),
  //   });

  //   switch (action) {
  //     case 1:
  //       channel.set({ confirmed: true });
  //       await channel.save();
  //       break;
  //     case 2:
  //       break;
  //     case 4:
  //       await M3UChannelModel.bulkSave(channels);
  //     case 3:
  //     case 5:
  //     default:
  //       break;
  //   }
  // }

  return;
};

const confirmChannels = async (direction?: number): Promise<void> => {
  const channels: ChannelInfoDocument[] = await M3UChannelModel.find(
    { confirmed: false, tvgId: !direction ? null : undefined },
    null,
    { limit: 100, sort: { confidence: direction } }
  );

  for (const channel of channels) {
    await ConfirmChannel(channel);
  }

  return await confirmChannels(direction);
};

program
  .command('confirm-channels')
  .description('Iterate channels and update confirmation')
  .action(entry);

program.parse();
