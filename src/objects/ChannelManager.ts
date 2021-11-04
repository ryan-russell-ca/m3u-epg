import IPTVOrgCode from "./files/IPTVOrgCode";
import M3UFile from "./files/M3U";
import XMLTVList from "./files/XMLTVList";
import Matcher from "./helpers/Matcher";

class ChannelManager {
  private _loaded = false;
  private _xmlList = new XMLTVList();
  private _m3uFile = new M3UFile();
  private _iptvOrgCode = new IPTVOrgCode();

  public load = async (refresh = false): Promise<void> => {
    if (this.isLoaded && !refresh) {
      return;
    }

    await this._iptvOrgCode.load(refresh);

    const matcher = new Matcher(this._iptvOrgCode.codeList);

    await this._m3uFile.load(matcher, refresh);

    const tvgIds = this._m3uFile.tvgIds;
    const channelCodes = this._iptvOrgCode.getCodesByTvgIds(tvgIds);

    const { xmlTvUrls, codeGuides } = this.getXmlListUrls(channelCodes);

    await this._xmlList.load(Array.from(xmlTvUrls), tvgIds);

    // this._xmlList.mergeByCode(codeGuides);

    // await this._m3uFile.insertCodeInfo(matchedCodes);

    await this._iptvOrgCode.save();
    await this._m3uFile.save();
    await this._xmlList.save();

    this._loaded = true;
  };

  public getM3U = async () => {
    return await this._m3uFile.toString();
  };

  public getXMLTV = () => {
    return this._xmlList.toString();
  };

  // public getInfo = (options: XMLTV.MatchOptions) => {
  //   return this._iptvOrgCode.match(options);
  // };

  // public getChannelJSON = (filters: M3U.ChannelInfoFilters) => {
  //   return this._m3uFile.getChannelJSON(filters);
  // };

  public get isLoaded() {
    return this._loaded;
  }

  private getXmlListUrls = (channel: XMLTV.CodeModel[]) => {
    return channel.reduce<{
      xmlTvUrls: Set<string>;
      codeGuides: Map<string, string>;
    }>(
      (acc, channel) => {
        const cuurrentChannel = channel as XMLTV.CodeDocument &
          M3U.ChannelInfoModel;

        const xmlTvUrls = Object.keys(acc.xmlTvUrls);
        const guide =
          cuurrentChannel.guides.find((guide) => xmlTvUrls.includes(guide)) ||
          cuurrentChannel.guides[0];

        acc.xmlTvUrls.add(guide);
        acc.codeGuides.set(cuurrentChannel.tvgId, guide);

        return acc;
      },
      {
        xmlTvUrls: new Set<string>(),
        codeGuides: new Map<string, string>(),
      }
    );
  };
}

export default ChannelManager;
