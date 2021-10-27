import Mongoose, { Schema } from "mongoose";

export const M3UGroupSchema = new Schema(
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
    },
    parsedName: String,
    parsedIds: [String],
    logo: String,
    id: String,
    definition: String,
  },
  { collection: "playlistItem" }
);

export const M3UGroupModel = Mongoose.model<M3U.ChannelInfo>(
  "M3UGroupModel",
  M3UGroupSchema
);

const M3USchema = new Schema(
  {
    date: { type: Date, default: Date.now() },
    m3u: {
      type: [M3UGroupSchema],
      required: true,
    },
  },
  { collection: "playlist" }
);

const M3UModel = Mongoose.model<M3U.BaseModel>("M3UModel", M3USchema);

export default M3UModel;
