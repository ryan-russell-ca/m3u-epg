import MongoConnector, { MongoCollection } from '@objects/database/Mongo';
import IPTVOrgCode from '@objects/files/IPTVOrgCode';
import * as SharedFunctions from '@shared/functions';

const CODES_JSON_STATIC_DATA_FILE = process.env
  .CODES_JSON_STATIC_DATA_FILE as string;
const COUNTRY_WHITELIST = JSON.parse(process.env.COUNTRY_WHITELIST as string);
const CODES_EXPIRATION_MILLI =
  parseInt(process.env.CODES_EXPIRATION_SECONDS as string) * 1000;

describe('IPTVOrgCode Tests', () => {
  const originalEnvs = { ...process.env };
  let codesList: XMLTV.CodeRaw[] = [];
  let iptvOrgCode: IPTVOrgCode;
  let getJsonSpy: jasmine.Spy<(url: string) => Promise<string>>;

  beforeAll(async () => {
    // Reset DB collections
    await MongoConnector.emptyCollections([
      MongoCollection.XMLTvCode,
      MongoCollection.XMLTvCodes,
    ]);

    jasmine.clock().install();

    codesList = JSON.parse(
      await SharedFunctions.getJson(CODES_JSON_STATIC_DATA_FILE)
    );

    getJsonSpy = spyOn(SharedFunctions, 'getJson').and.callThrough();
    iptvOrgCode = new IPTVOrgCode();
    return;
  });

  afterAll(() => {
    jasmine.clock().uninstall();
  });

  describe('IPTVOrgCode', () => {
    it('Should be able to load a new IPTVOrgCode', async () => {
      const didLoad = await iptvOrgCode.load();

      expect(didLoad).toBeTrue();
      expect(getJsonSpy).toHaveBeenCalled();
      expect(iptvOrgCode.isLoaded).toBeTrue;
      return;
    });

    it('Should match codeList to filtered original by country', async () => {
      const codeListIds = codesList
        .filter((code) => COUNTRY_WHITELIST.includes(code.country))
        .map((code) => code.tvg_id);
      const iptvOrgCodeListIds = iptvOrgCode.codeList.map((code) => code.tvgId);

      expect(iptvOrgCodeListIds).toEqual(codeListIds);
      return;
    });

    it('Should match list selected ids', async () => {
      const iptvOrgCodesList = iptvOrgCode.codeList;

      const codes = [
        iptvOrgCodesList[Math.floor(Math.random() * iptvOrgCodesList.length)],
        iptvOrgCodesList[Math.floor(Math.random() * iptvOrgCodesList.length)],
        iptvOrgCodesList[Math.floor(Math.random() * iptvOrgCodesList.length)],
      ];

      const codesGet = iptvOrgCode.getCodesByTvgIds(
        codes.map((code) => code.tvgId)
      );

      expect(new Set(codes)).toEqual(new Set(codesGet));
      return;
    });

    it('Should save Mongo collections', async () => {
      const saved = await iptvOrgCode.save();

      expect(saved).toBeTrue();
    });

    it('Should not reload when loaded', async () => {
      const didLoad = await iptvOrgCode.load();

      expect(didLoad).toBeFalse();
    });

    it('Should reload with reload flag `true`', async () => {
      const id = iptvOrgCode.id;
      const didLoad = await iptvOrgCode.load(true);

      expect(didLoad).toBeTrue();
      expect(getJsonSpy).toHaveBeenCalledTimes(2);
      expect(iptvOrgCode.isLoaded).toBeTrue;
      expect(id).not.toEqual(iptvOrgCode.id);
    });

    it('Should match codeList to filtered original by country after reload', async () => {
      const codeListIds = codesList
        .filter((code) => COUNTRY_WHITELIST.includes(code.country))
        .map((code) => code.tvg_id);
      const iptvOrgCodeListIds = iptvOrgCode.codeList.map((code) => code.tvgId);

      expect(iptvOrgCodeListIds).toEqual(codeListIds);
      return;
    });

    it('Should reload when expired time is reached', async () => {
      process.env.CODES_JSON_STATIC_DATA_FILE =
        originalEnvs.CODES_JSON_SHORT_STATIC_DATA_FILE;

      jasmine.clock().mockDate(new Date());
      jasmine.clock().tick(CODES_EXPIRATION_MILLI);

      const id = iptvOrgCode.id;
      const didLoad = await iptvOrgCode.load();

      // Time has been increase, so the same
      expect(didLoad).toBeTrue();
      expect(getJsonSpy).toHaveBeenCalledTimes(3);
      expect(iptvOrgCode.isLoaded).toBeTrue;
      expect(iptvOrgCode.isLoaded).toBeTrue;
      expect(id).not.toEqual(iptvOrgCode.id);
    });

    it('Should select most recent Document', async () => {
      const newIptvOrgCode = new IPTVOrgCode();
      const didLoad = await newIptvOrgCode.load();

      expect(didLoad).toBeTrue();
      expect(newIptvOrgCode.id).toEqual(iptvOrgCode.id);
      expect(getJsonSpy).toHaveBeenCalledTimes(3);
      expect(iptvOrgCode.isLoaded).toBeTrue;
    });
  });
});
