import { Router } from "express";
import { getPlaylist, getEpg, sandbox } from "./Playlist";

// User-route
const playlistRouter = Router();
playlistRouter.get("/playlist", getPlaylist);
playlistRouter.get("/epg", getEpg);
playlistRouter.get("/sandbox", sandbox);

// Export the base-router
const baseRouter = Router();
baseRouter.use("/", playlistRouter);
export default baseRouter;
