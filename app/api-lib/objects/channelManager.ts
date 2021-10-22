import IPTVOrgCode from './files/IPTVOrgCode';
import M3UFile from './files/M3U';
import XMLTVList from './files/XMLTVList';
import Matcher from './helpers/Matcher';
import { ChannelInfoFilters, ChannelInfoModel } from '@/types/m3u';
import { CodeModel, CodeDocument } from '@/types/xmltv';

class ChannelManager {
  private _loaded = false;
  private _xmlList = new XMLTVList();
  private playlistFile = new M3UFile();
  private _iptvOrgCode = new IPTVOrgCode();

  public load = async (refresh = false): Promise<void> => {
    if (this.isLoaded && !refresh) {
      return;
    }

    await this._iptvOrgCode.load(refresh);

    const matcher = new Matcher(this._iptvOrgCode.codeList);

    await this.playlistFile.load(matcher, refresh);

    const tvgIds = this.playlistFile.tvgIds;
    const channelCodes = this._iptvOrgCode.getCodesByTvgIds(tvgIds);

    const xmlTvUrls = this.getXmlListUrls(channelCodes);

    await this._xmlList.load(Array.from(xmlTvUrls), tvgIds);

    this._loaded = true;
  };

  public getM3U = () => {
    return this.playlistFile.toString();
  };

  public getXMLTV = () => {
    return this._xmlList.toString();
  };

  public getChannelJSON = (filters: ChannelInfoFilters) => {
    return this.playlistFile.getChannelJSON(filters);
  };

  public getUnmatchedChannels = () => {
    return this.playlistFile
      .getChannels()
      .filter((channel) => !channel.confirmed && !channel.tvgId);
  };

  public getMatch = async (filter: { name?: string; id?: string }) => {
    return this.playlistFile.getSingleChannelMatch(filter);
  };

  public get isLoaded() {
    return this._loaded;
  }

  private getXmlListUrls = (channel: CodeModel[]) => {
    return channel.reduce<Set<string>>((acc, channel) => {
      const cuurrentChannel = channel as CodeDocument & ChannelInfoModel;

      const xmlTvUrls = Object.keys(acc);
      const guide =
        cuurrentChannel.guides.find((guide) => xmlTvUrls.includes(guide)) ||
        cuurrentChannel.guides[0];

      acc.add(guide);

      return acc;
    }, new Set<string>());
  };
}

const channelManager = new ChannelManager();

export default channelManager;
