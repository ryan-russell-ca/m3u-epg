import Mongoose, { Schema } from "mongoose";

const XMLTVChannelSchema = new Schema(
  {
    "@_id": { type: String, unique: true },
    "display-name": String,
    icon: {
      "@_src": String,
    },
  },
  { collection: "xmltvChannel" }
);

export const XMLTVChannelModel = Mongoose.model<EPG.ChannelModel>(
  "XMLTVChannelModel",
  XMLTVChannelSchema
);

const XMLTVProgrammeSchema = new Schema(
  {
    "@_start": String,
    "@_stop": String,
    "@_channel": String,
    title: { "#text": String, "@_lang": String },
  },
  { collection: "xmltvProgramme" }
);

XMLTVProgrammeSchema.index(
  { "@_start": 1, "@_channel": 1 },
  {
    name: "unique_schedule_item",
    unique: true,
  },
);

export const XMLTVProgrammeModel = Mongoose.model<EPG.ProgrammeModel>(
  "XMLTVProgrammeModel",
  XMLTVProgrammeSchema
);

const XMLTVSchema = new Schema(
  {
    date: { type: Date, default: Date.now() },
    url: { type: String, required: true, unique: true },
    xmlTv: {
      channel: {
        type: [{ type: Schema.Types.ObjectId, ref: "XMLTVChannelModel" }],
      },
      programme: {
        type: [{ type: Schema.Types.ObjectId, ref: "XMLTVProgrammeModel" }],
      },
    },
  },
  { collection: "xmltv" }
);

export const XMLTVModel = Mongoose.model<EPG.BaseModel>(
  "XMLTVModel",
  XMLTVSchema
);
