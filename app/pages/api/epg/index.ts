import fs from 'fs';
import ChannelManager from '@/api-lib/objects/channelManager';

const routes = async (req, res) => {
  const refresh = req.query.refresh === 'true';

  await ChannelManager.load(refresh);

  const { filename, size } = ChannelManager.getXMLTV();

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Content-Length', size);
  res.status(200)

  fs.createReadStream(filename).pipe(res);
};

export default routes;
