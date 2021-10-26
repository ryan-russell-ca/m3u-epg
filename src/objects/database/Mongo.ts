import Mongoose from "mongoose";

const MONO_DB_CONNECTION_STRING = process.env
  .MONO_DB_CONNECTION_STRING as string;

class MongoConnector {
  private _connection = Mongoose;

  constructor() {
    this._connection.connection.on(
      "error",
      console.error.bind(console, "MongoDB connection error:")
    );
  }

  public connect = async () => {
    await this._connection.connect(MONO_DB_CONNECTION_STRING, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    return true;
  };

  public get connected() {
    return this._connection.connection.readyState === 1;
  }
}

const mongoConnector = new MongoConnector();

export default mongoConnector;
