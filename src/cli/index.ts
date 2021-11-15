#! /usr/bin/env ts-node -r module-alias/register

import dotenv from 'dotenv';

const env = dotenv.config({
  path: __dirname + '/../pre-start/env/cli.env',
});

require('./ConfirmChannels');
