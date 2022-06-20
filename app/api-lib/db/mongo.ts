import Logger from '../modules/Logger';
import Mongoose from 'mongoose';

const MONGO_DB_CONNECTION_STRING = process.env
  .MONGO_DB_CONNECTION_STRING as string;

export enum MongoCollectionNames {
  PlaylistChannelCountry = 'playlistChannelCountry',
  PlaylistChannelGroup = 'playlistChannelGroup',
  PlaylistChannel = 'playlistChannel',
  UserPlaylist = 'userPlaylist',
  Playlist = 'playlist',
  XMLTVCode = '@/types/xmltvCode',
  XMLTVCodes = '@/types/xmltvCodes',
  XMLTVChannel = '@/types/xmltvChannel',
  XMLTVProgramme = '@/types/xmltvProgramme',
  XMLTV = '@/types/xmltv',
  User = '@/types/user',
  Token = 'token',
}

export enum MongoCollectionModelNames {
  PlaylistChannelGroupModel = 'PlaylistChannelGroupModel',
  PlaylistChannelCountryModel = 'PlaylistChannelCountryModel',
  PlaylistChannelModel = 'PlaylistChannelModel',
  PlaylistModel = 'PlaylistModel',
  UserPlaylistModel = 'UserPlaylistModel',
  UserModel = 'UserModel',
  TokenModel = 'TokenModel',
  XMLTVCodeModel = 'XMLTVCodeModel',
  XMLTVCCodesModel = 'XMLTVCCodesModel',
  XMLTVProgrammeModel = 'XMLTVProgrammeModel',
  XMLTVChannelModel = 'XMLTVChannelModel',
  XMLTVModel = 'XMLTVModel',
}

class MongoConnector {
  constructor() {
    const instance = this.constructor.instance;

    if (instance) {
      if (!this.connected) {
        this.connect();
      }

      return instance;
    }

    this.constructor.instance = this;

    Mongoose.connection.on(
      'error',
      console.error.bind(console, 'MongoDB connection error:')
    );

    Mongoose.connection.on('connected', () =>
      Logger.info('[MongoConnector.on(connected)] MongoDB connected')
    );

    Mongoose.connection.on('connection', () =>
      Logger.info('[MongoConnector.on(connection)]: Connecting to MongoDB...')
    );

    Mongoose.connection.on('disconnected', () =>
      Logger.info('[MongoConnector.on(disconencted)] MongoDB disconnected')
    );

    if (!this.connected) {
      this.connect();
    }
  }

  public database = async () => {
    if (!this.connected) {
      await this.connect();
    }

    return Mongoose.connection.getClient();
  };

  public connect = async () => {
    await Mongoose.connect(MONGO_DB_CONNECTION_STRING);

    return true;
  };

  public emptyCollection = async (collectionName: string) => {
    if (!this.connected) {
      await this.connect();
    }

    return await Mongoose.connection.collection(collectionName).deleteMany({});
  };

  public emptyCollections = async (collectionNames: string[]) => {
    if (!this.connected) {
      await this.connect();
    }

    return Promise.all(
      collectionNames.map((collectionName) =>
        this.emptyCollection(collectionName)
      )
    );
  };

  public get connected() {
    return Mongoose.connection.readyState;
  }
}

const mongoConnector = new MongoConnector();

export default mongoConnector;
