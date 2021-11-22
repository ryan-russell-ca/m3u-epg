import ChannelManager from '@/api-lib/objects/channelManager';

const routes = async (req, res) => {
  const refresh = req.query.refresh === 'true';

  await ChannelManager.load(refresh);

  res.setHeader('Content-Type', 'application/xml');
  return res.status(200).send(ChannelManager.getXMLTV());
};

export default routes;
