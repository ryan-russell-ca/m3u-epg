import MongoStore from 'connect-mongo';
import nextSession from 'next-session';
import { promisifyStore } from 'next-session/lib/compat';
import Mongo from '@/api-lib/db/mongo';
import { NextApiRequest, NextApiResponse } from 'next';
import { Middleware } from 'next-connect';
import Logger from '@/api-lib/modules/Logger';

const mongoStore = MongoStore.create({
  clientPromise: Mongo.database(),
  stringify: false,
});

const getSession = nextSession({
  store: promisifyStore(mongoStore),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 2 * 7 * 24 * 60 * 60, // 2 weeks,
    path: '/',
    sameSite: 'strict',
  },
  touchAfter: 1 * 7 * 24 * 60 * 60, // 1 week
});

const session: Middleware<NextApiRequest, NextApiResponse> = async (
  req,
  res,
  next
) => {
  try {
    await getSession(req, res);
    next();
  } catch (e) {
    Logger.err(e);
  }
};

export default session;
