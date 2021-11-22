import ChannelManager from '@/api-lib/objects/channelManager';

const routes = async (req, res) => {
  const refresh = req.query.refresh === 'true';

  await ChannelManager.load(refresh);

  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send(await ChannelManager.getM3U());
};

export default routes;
