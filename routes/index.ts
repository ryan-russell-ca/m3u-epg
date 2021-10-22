import { Router } from "express";
import { getPlaylist, getMatches, getEpg, sandbox } from "./Playlist";

// User-route
const playlistRouter = Router();
playlistRouter.get("/playlist", getPlaylist);
playlistRouter.get("/playlist/matches", getMatches);
playlistRouter.get("/epg", getEpg);
playlistRouter.get("/sandbox", sandbox);

// Export the base-router
const baseRouter = Router();
baseRouter.use("/", playlistRouter);
export default baseRouter;
