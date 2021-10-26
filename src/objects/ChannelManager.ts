import IPTVOrgCode from "./files/IPTVOrgCode";
import M3UFile from "./files/M3U";
import XMLTVList from "./files/XMLTVList";
import EPG from "EPG";
import M3U from "M3U";

class ChannelManager {
  private _loaded = false;
  private _xmlList = new XMLTVList();
  private _m3uFile = new M3UFile();
  private _iptvOrgCode = new IPTVOrgCode();

  public load = async (): Promise<void> => {
    if (this.isLoaded) {
      return;
    }

    if (!this._m3uFile.isLoaded) {
      await this._m3uFile.load();
    }

    if (!this._iptvOrgCode.isLoaded) {
      await this._iptvOrgCode.load();
    }

    const matchedCodes = this.getMatchedCodes(this._iptvOrgCode, this._m3uFile);
    
    const { xmlTvUrls, codeGuides } = this.getXmlListUrls(
      Object.values(matchedCodes)
    );

    if (!this._xmlList.isLoaded) {
      await this._xmlList.load(Object.keys(xmlTvUrls));
    }

    await this._m3uFile.insertCodeInfo(matchedCodes);
    this._xmlList.mergeByCode(codeGuides);

    this._loaded = true;
  };

  public getM3U = () => {
    return this._m3uFile.toString();
  };

  public getEPG = () => {
    return this._xmlList.toString();
  };

  public getInfo = (options: EPG.MatchOptions) => {
    return this._iptvOrgCode.match(options);
  };

  public get isLoaded() {
    return this._loaded;
  }

  private getXmlListUrls = (codes: (EPG.Code | M3U.CustomMapping)[]) => {
    const guides = codes.reduce<{
      xmlTvUrls: { [xmlTvUrl: string]: boolean };
      codeGuides: { [id: string]: string };
    }>(
      (acc, code) => {
        const currentCode = code as EPG.Code;

        if (!currentCode.tvg_id || !currentCode.guides) {
          return acc;
        }

        const xmlTvUrls = Object.keys(acc.xmlTvUrls);
        const guide =
          currentCode.guides.find((guide) => xmlTvUrls.includes(guide)) ||
          currentCode.guides[0];

        acc.xmlTvUrls[guide] = true;
        acc.codeGuides[currentCode.tvg_id] = guide;

        return acc;
      },
      {
        xmlTvUrls: {},
        codeGuides: {},
      }
    );

    return guides;
  };

  private getMatchedCodes = (iptvOrgCode: IPTVOrgCode, m3uFile: M3UFile) => {
    return m3uFile.groups.reduce<{
      [channelUrl: string]: EPG.Code | M3U.CustomMapping;
    }>((acc, group) => {
      const customMapping = m3uFile.customMap(group);

      if (customMapping && group.url) {
        acc[group.url] = customMapping;
        return acc;
      }

      const match = iptvOrgCode.match({
        name: [group.name, group.parsedName],
        id: [group.id, ...(group.parsedIds || [])],
        formatted: true,
      }) as EPG.CodeMatch[];

      if (match[0]?.code && group.url) {
        acc[group.url] = match[0].code;
      }

      return acc;
    }, {});
  };
}

export default ChannelManager;
