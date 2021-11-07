import MongoConnector, { MongoCollection } from "@objects/database/Mongo";
import XMLTVList from "@objects/files/XMLTVList";
import { VALID_EPG_TEXT } from "spec/fixtures/validEPGText";

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

describe("XMLTVList Tests", () => {
  let xmlTvList: XMLTVList;

  beforeAll(async () => {
    // Reset DB collections
    await MongoConnector.emptyCollections([
      MongoCollection.XMLTvCode,
      MongoCollection.XMLTvCodes,
    ]);

    xmlTvList = new XMLTVList();

    return;
  });

  describe("XMLTVList", () => {
    it("Should be able to load a new XMLTVList", async () => {
      const didLoad = await xmlTvList.load(
        ["Test XML url (from file)"],
        FILTER_IDS
      );

      expect(didLoad).toBeTrue();
      expect(xmlTvList.isLoaded).toBeTrue;
      return;
    });

    it("Should match list to filtered original by ids", async () => {
      expect(xmlTvList.toString()).toEqual(VALID_EPG_TEXT);
      return;
    });
  });
});
