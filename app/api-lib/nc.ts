import Logger from '@/api-lib/modules/Logger';
import { NextApiRequest, NextApiResponse } from 'next';

export const ncOpts = {
  onError(err: any, _req: NextApiRequest, res: NextApiResponse) {
    Logger.err(err);
    res.statusCode =
      err.status && err.status >= 100 && err.status < 600 ? err.status : 500;
    res.json({ message: err.message });
  },
};
