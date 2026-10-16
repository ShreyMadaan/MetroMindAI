
const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema(
  {
    fromStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true,
    },

    toStation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true,
    },

    line: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MetroLine",
      required: true,
    },

    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },

    travelTimeMinutes: {
      type: Number,
      required: true,
      min: 0,
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

connectionSchema.index({
  fromStation: 1,
  toStation: 1,
  line: 1,
}, { unique: true });

module.exports = mongoose.model(
  "Connection",
  connectionSchema
);
