import MongoConnector, { MongoCollection } from '@/shared/database/Mongo';
import XMLTVList from '@/objects/files/XMLTVList';
import { FILTER_IDS, VALID_EPG_TEXT } from 'spec/fixtures/validEPGText';

describe('XMLTVList Tests', () => {
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

  describe('XMLTVList', () => {
    it('Should be able to load a new XMLTVList', async () => {
      const didLoad = await xmlTvList.load(
        ['Test XML url (from file)'],
        FILTER_IDS
      );

      expect(didLoad).toBeTrue();
      expect(xmlTvList.isLoaded).toBeTrue;
      return;
    });

    it('Should match list to filtered original by ids', async () => {
      expect(xmlTvList.toString()).toEqual(VALID_EPG_TEXT);
      return;
    });
  });
});
