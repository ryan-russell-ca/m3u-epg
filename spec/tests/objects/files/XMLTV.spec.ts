import xmlParser from "fast-xml-parser";
import MongoConnector, { MongoCollection } from "@objects/database/Mongo";
import XMLTV from "@objects/files/XMLTV";
import { XML_PARSE_OPTIONS } from "@objects/files/XMLTVList";
import * as SharedFunctions from "@shared/functions";
import { parseXmlDate } from "@shared/functions";

const XMLTV_STATIC_DATA_FILE = process.env.XMLTV_STATIC_DATA_FILE as string;
const XMLTV_EXPIRATION_MILLI =
  parseInt(process.env.XMLTV_EXPIRATION_SECONDS as string) * 1000;

const getProgrammeDate = (programme: XMLTV.ProgrammeModel) => {
  const { year, month, day, hour, minute, second } = parseXmlDate(
    programme["@_start"]
  );

  return new Date(Date.UTC(year, month, day, hour, minute, second));
};

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

describe("XMLTV Tests", () => {
  const originalEnvs = { ...process.env };
  let xmlTv: XMLTV;
  let xmlTvJson: {
    channel: XMLTV.ChannelModel[];
    programme: XMLTV.ProgrammeModel[];
  };
  let getJsonSpy: jasmine.Spy<(url: string) => Promise<string>>;

  beforeAll(async () => {
    // Reset DB collections
    await MongoConnector.emptyCollections([
      MongoCollection.XMLTv,
      MongoCollection.XMLTvChannel,
      MongoCollection.XMLTvProgramme,
    ]);

    jasmine.clock().install();

    xmlTvJson = xmlParser.parse(
      await SharedFunctions.getJson(XMLTV_STATIC_DATA_FILE),
      XML_PARSE_OPTIONS
    ).tv;

    getJsonSpy = spyOn(SharedFunctions, "getJson").and.callThrough();
    xmlTv = new XMLTV("Test XML url (from file)", XML_PARSE_OPTIONS);

    // Set the date within range of the test XML
    const date = getProgrammeDate(xmlTvJson.programme[10]);
    jasmine.clock().mockDate(date);

    return;
  });

  afterAll(() => {
    jasmine.clock().uninstall();
  });

  describe("XMLTV", () => {
    it("Should be able to load a new XMLTV", async () => {
      const didLoad = await xmlTv.load(FILTER_IDS);

      expect(didLoad).toBeTrue();
      expect(getJsonSpy).toHaveBeenCalled();
      expect(xmlTv.isLoaded).toBeTrue;
      return;
    });

    it("Should match list to filtered original by ids", async () => {
      const xmlTvFiltered = {
        channel: xmlTvJson.channel.filter((c) =>
          FILTER_IDS.includes(c["@_id"])
        ),
        programme: xmlTvJson.programme.filter((p) =>
          FILTER_IDS.includes(p["@_channel"])
        ),
      };

      expect(xmlTvFiltered.channel.map((c) => c["@_id"])).toEqual(
        xmlTv.getChannel().map((c) => c["@_id"])
      );
      return;
    });

    it("Should match list selected ids", async () => {
      const xmlTvsChannelList = xmlTv.getChannel();
      const xmlTvsProgrammeList = xmlTv.getProgramme();

      const indicies = [
        Math.floor(Math.random() * xmlTvsChannelList.length),
        Math.floor(Math.random() * xmlTvsChannelList.length),
        Math.floor(Math.random() * xmlTvsChannelList.length),
      ];

      const filtered = indicies.reduce<
        {
          channel: XMLTV.ChannelModel;
          programme: XMLTV.ProgrammeModel[];
        }[]
      >((acc, i) => {
        const channel = xmlTvsChannelList[i];

        acc.push({
          channel,
          programme: xmlTvsProgrammeList.filter(
            (p) =>
              p["@_channel"] === channel["@_id"] &&
              SharedFunctions.filterProgrammeByDate(p)
          ),
        });

        return acc;
      }, []);

      filtered.forEach(({ channel, programme }, i) => {
        const xmlInfo = xmlTv.getByTvgId(channel["@_id"]);

        if (!xmlInfo) {
          throw new Error();
        }

        expect(channel).toEqual(xmlInfo.channel);
        expect(programme).toEqual(xmlInfo.programme);
      });

      return;
    });

    it("Should save Mongo collections", async () => {
      const saved = await xmlTv.save();

      expect(saved).toBeTrue();
    });

    it("Should not reload when loaded", async () => {
      const didLoad = await xmlTv.load(FILTER_IDS);

      expect(didLoad).toBeFalse();
    });

    it("Should reload with reload flag `true`", async () => {
      const id = xmlTv.id;
      const didLoad = await xmlTv.load(FILTER_IDS, true);

      expect(didLoad).toBeTrue();
      expect(getJsonSpy).toHaveBeenCalledTimes(2);
      expect(xmlTv.isLoaded).toBeTrue;
      expect(id).toEqual(xmlTv.id);
    });

    it("Should reload when expired time is reached", async () => {
      const id = xmlTv.id;

      jasmine.clock().mockDate(new Date());
      jasmine.clock().tick(XMLTV_EXPIRATION_MILLI);

      const didLoad = await xmlTv.load(FILTER_IDS);

      expect(didLoad).toBeTrue();
      expect(getJsonSpy).toHaveBeenCalledTimes(3);
      expect(xmlTv.isLoaded).toBeTrue;
      expect(id).toEqual(xmlTv.id);
    });

    it("Should select most recent Document", async () => {
      const newXmlTv = new XMLTV("Test XML url (from file)", XML_PARSE_OPTIONS);
      const didLoad = await newXmlTv.load(FILTER_IDS);

      expect(didLoad).toBeTrue();
      expect(newXmlTv.id).toEqual(xmlTv.id);
      expect(getJsonSpy).toHaveBeenCalledTimes(3);
      expect(xmlTv.isLoaded).toBeTrue;
    });
  });
});
