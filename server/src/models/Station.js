
const mongoose = require("mongoose");

const stationSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    lines: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MetroLine",
      },
    ],

    location: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },

    isInterchange: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

stationSchema.index({ name: 1 });

module.exports = mongoose.model("Station", stationSchema);
