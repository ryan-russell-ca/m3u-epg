import { Router } from 'express';
import { getPlaylist, getEpg, getChannelInfo, sandbox, getMatches, getUnmatched } from './Playlist';

// User-route
const playlistRouter = Router();
playlistRouter.get('/playlist', getPlaylist);
playlistRouter.get('/epg', getEpg);
playlistRouter.get('/channel/match', getMatches);
playlistRouter.get('/channel/info', getChannelInfo);
playlistRouter.get('/channel/unmatched', getUnmatched);
playlistRouter.get('/sandbox', sandbox);

// Export the base-router
const baseRouter = Router();
baseRouter.use('/', playlistRouter);
export default baseRouter;
