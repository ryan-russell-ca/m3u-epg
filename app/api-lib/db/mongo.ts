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
  XMLTVCode = 'xmltvCode',
  XMLTVCodes = 'xmltvCodes',
  XMLTVChannel = 'xmltvChannel',
  XMLTVProgramme = 'xmltvProgramme',
  XMLTV = 'xmltv',
  User = 'user',
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
  private _connection = Mongoose;

  constructor() {
    this._connection.connection.on(
      'error',
      console.error.bind(console, 'MongoDB connection error:')
    );

    this._connection.connection.on('connected', () =>
      Logger.info('MongoDB connected')
    );

    this._connection.connection.on('disconencted', () =>
      Logger.info('MongoDB disconnected')
    );

    this.connect();
  }

  public database = async () => {
    if (!this.connected) {
      await this.connect();
    }

    return this._connection.connection.getClient();
  };

  public connect = async () => {
    Logger.info('[MongoConnector.connect]: Connecting to MongoDB...');

    await this._connection.connect(MONGO_DB_CONNECTION_STRING);

    return true;
  };

  public emptyCollection = async (collectionName: string) => {
    if (!this.connected) {
      await this.connect();
    }

    return await this._connection.connection
      .collection(collectionName)
      .deleteMany({});
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
    return this._connection.connection.readyState === 1;
  }
}

const mongoConnector = new MongoConnector();

export default mongoConnector;
