import IPTVOrgCode from "./files/IPTVOrgCode";
import M3UFile from "./files/M3U";
import XMLTVList from "./files/XMLTVList";
import EPG from "EPG";

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

  public get isLoaded() {
    return this._loaded;
  }

  private getXmlListUrls = (codes: EPG.Code[]) => {
    const guides = codes.reduce<{
      xmlTvUrls: { [xmlTvUrl: string]: boolean };
      codeGuides: { [id: string]: string };
    }>(
      (acc, code) => {
        const { guides, country } = code;
        const guide =
          guides.find((guide) => guide.includes(`/${country}`)) || guides[0];
        acc.xmlTvUrls[guide] = true;
        acc.codeGuides[code.tvg_id] = guide;
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
    return m3uFile.groups.reduce<{ [channelUrl: string]: EPG.Code }>(
      (acc, group) => {
        const match = iptvOrgCode.match({
          name: group.name,
          id: [group.id, ...(group.parsedIds || [])],
          formatted: true,
        }) as EPG.CodeMatch | null;

        if (match?.code && group.url) {
          acc[group.url] = match.code;
        }

        return acc;
      },
      {}
    );
  };
}

export default ChannelManager;
