import Mongoose, { Schema, ObjectId } from "mongoose";

export const M3UChannelSchema = new Schema(
  {
    group: { type: String, required: true },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    country: {
      type: String,
      enum: ["ca", "us", "uk", "unpopulated"],
      required: true,
    },
    url: {
      type: String,
      required: true,
      unique: true,
    },
    parsedName: String,
    parsedIds: [String],
    logo: String,
    id: String,
    definition: String,
  },
  { collection: "channel" }
);

export const M3UChannelModel = Mongoose.model<M3U.ChannelInfo>(
  "M3UChannelModel",
  M3UChannelSchema
);

const M3USchema = new Schema(
  {
    date: { type: Date, default: Date.now() },
    m3u: {
      type: [{ type: Schema.Types.ObjectId, ref: "M3UChannelModel" }],
      required: true,
    },
  },
  { collection: "playlist" }
);

const M3UModel = Mongoose.model<M3U.BaseModel>("M3UModel", M3USchema);

export default M3UModel;
