import Mongo from '@/database/mongo';
import { PlaylistChannelModel } from '@/database/PlaylistSchema';

const routes = async (req, res) => {
  if(!Mongo.connected) {
    await Mongo.connect();
  }

  const channels = await PlaylistChannelModel.find({}, {}, { limit: 100 });
  res.status(200).json(channels.map((c) => c.toJSON()));
};


export default routes;
