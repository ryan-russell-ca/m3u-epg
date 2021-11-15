import { M3UChannelModel } from '@objects/database/M3USchema';
import MongoConnector from '@objects/database/Mongo';
import { program } from 'commander';
import Inquirer from 'inquirer';
import { table } from 'table';
import TableViewer from './helpers/TableViewer';

enum EntryActions {
  ViewConfirmed = 1,
  ViewUnconfirmed = 2,
  ViewAll = 3,
  ConfirmChannels = 4,
  Quit = 5,
}

enum ConfirmationActions {
  Confirm = 1,
  Skip = 2,
  Edit = 3,
  Save = 4,
  Quit = 5,
}

const prompt = Inquirer.createPromptModule();

const entry = async () => {
  const { action } = await prompt({
    type: 'list',
    name: 'action',
    choices: [
      { name: 'View Confirmed Channels', value: EntryActions.ViewConfirmed },
      {
        name: 'View Unconfirmed Channels',
        value: EntryActions.ViewUnconfirmed,
      },
      { name: 'View All Channels', value: EntryActions.ViewAll },
      { name: 'Confirm Channels', value: EntryActions.ConfirmChannels },
    ],
    default: 0,
  });

  switch (action) {
    case 1:
      await viewChannels(true);
      break;
    case 2:
      return confirmChannels(false);
    case 3:
      return confirmChannels(true);
    case 4:
      return confirmChannels();
    default:
      break;
  }

  return;
};

const viewChannels = async (confirmed?: boolean) => {
  if (!MongoConnector.connected) {
    await MongoConnector.connect();
  }

  const channels: M3U.ChannelInfoDocument[] = await M3UChannelModel.find(
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

const confirmChannels = async (confirmed?: boolean) => {
  if (!MongoConnector.connected) {
    await MongoConnector.connect();
  }

  const channels: M3U.ChannelInfoDocument[] = await M3UChannelModel.find(
    confirmed !== undefined ? { confirmed } : {},
    null,
    { limit: 10 }
  );

  for (const channel of channels) {
    const { action } = await prompt({
      type: 'list',
      name: 'action',
      choices: [
        { name: 'Confirm & Save', value: ConfirmationActions.Confirm },
        { name: 'Skip', value: ConfirmationActions.Skip },
        { name: 'Edit', value: ConfirmationActions.Edit },
        { name: 'Save', value: ConfirmationActions.Save },
        { name: 'Quit', value: ConfirmationActions.Quit },
      ],
      default: 1,
      message: () => '\n' + table(Object.entries(channel.toJSON())),
    });

    switch (action) {
      case 1:
        channel.set({ confirmed: true });
        await channel.save();
        break;
      case 2:
        break;
      case 4:
        await M3UChannelModel.bulkSave(channels);
      case 3:
      case 5:
      default:
        break;
    }
  }

  return;
};

program
  .command('confirm-channels')
  .description('Iterate channels and update confirmation')
  .action(entry);

program.parse();
