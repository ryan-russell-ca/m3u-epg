import MongoConnector, { MongoCollection } from "@objects/database/Mongo";
import M3U from "@objects/files/M3U";
import Matcher from "@objects/helpers/Matcher";
import * as SharedFunctions from "@shared/functions";
import { CODE_LIST } from "spec/fixtures/codesList";
import { VALID_CHANNELS } from "spec/fixtures/validChannel";

const M3U_STATIC_DATA_FILE = process.env.M3U_STATIC_DATA_FILE as string;
const M3U_EXPIRATION_MILLI =
  parseInt(process.env.M3U_EXPIRATION_SECONDS as string) * 1000;

const FILTER_IDS = [
  "CBLN.ca",
  "CBLT.ca",
  "CBLTTV1.ca",
  "CBOFT.ca",
  "CBOT.ca",
  "CFGCDT2.ca",
  "CFGCDT.ca",
  "CFPL.ca",
  "CFTO.ca",
  "CFTODT54.ca",
  "CFTOTV21.ca",
  "CHBX.ca",
  "CHBXTV1.ca",
  "CHCHDT1.ca",
  "CHCHDT2.ca",
  "CHCHDT3.ca",
  "CHCHTV4.ca",
  "CHCHTV5.ca",
  "CHCHTV6.ca",
  "CHCHTV7.ca",
  "CHCJ.ca",
  "CHEX2.ca",
  "CHEX.ca",
  "CHFD.ca",
  "CHRODT43.ca",
];

describe("M3U Tests", () => {
  const originalEnvs = { ...process.env };
  const matcher = new Matcher([]);
  let m3u: M3U;
  let m3uJson: M3U.ChannelInfoModel[];
  let getJsonSpy: jasmine.Spy<(url: string) => Promise<string>>;

  beforeAll(async () => {
    // Reset DB collections
    await MongoConnector.emptyCollections([
      MongoCollection.Playlist,
      MongoCollection.PlaylistChannel,
    ]);

    jasmine.clock().install();

    m3uJson = SharedFunctions.parseJson(
      await SharedFunctions.getJson(M3U_STATIC_DATA_FILE)
    );

    getJsonSpy = spyOn(SharedFunctions, "getJson").and.callThrough();
    m3u = new M3U();

    return;
  });

  afterAll(() => {
    jasmine.clock().uninstall();
  });

  describe("M3U", () => {
    it("Should be able to load a new M3U", async () => {
      const didLoad = await m3u.load(matcher);

      expect(didLoad).toBeTrue();
      expect(getJsonSpy).toHaveBeenCalledTimes(2);
      expect(m3u.isLoaded).toBeTrue;
      return;
    });

    it("Should match list to filtered original by ids", async () => {
      const m3uFiltered = SharedFunctions.filterRegion(
        SharedFunctions.filterUnique(VALID_CHANNELS)
      ).map((channel) => channel.tvgId).filter((c) => c);

      expect(m3uFiltered).toEqual(m3u.tvgIds);
      return;
    });

    it("Should save Mongo collections", async () => {
      const saved = await m3u.save();

      expect(saved).toBeTrue();
    });

    it("Should not reload when loaded", async () => {
      const didLoad = await m3u.load(matcher);

      expect(didLoad).toBeFalse();
    });

    it("Should reload with reload flag `true`", async () => {
      const id = m3u.id;
      const didLoad = await m3u.load(matcher, true);

      expect(didLoad).toBeTrue();
      expect(getJsonSpy).toHaveBeenCalledTimes(4);
      expect(m3u.isLoaded).toBeTrue;
      expect(id).not.toEqual(m3u.id);
    });

    it("Should reload when expired time is reached", async () => {
      const id = m3u.id;

      jasmine.clock().mockDate(new Date());
      jasmine.clock().tick(M3U_EXPIRATION_MILLI);

      const didLoad = await m3u.load(matcher);

      expect(didLoad).toBeTrue();
      expect(getJsonSpy).toHaveBeenCalledTimes(6);
      expect(m3u.isLoaded).toBeTrue;
      expect(id).not.toEqual(m3u.id);
    });

    it("Should select most recent Document", async () => {
      const newXmlTv = new M3U();
      const didLoad = await newXmlTv.load(matcher);

      expect(didLoad).toBeTrue();
      expect(newXmlTv.id).toEqual(m3u.id);
      expect(getJsonSpy).toHaveBeenCalledTimes(6);
      expect(m3u.isLoaded).toBeTrue;
    });
  });
});
