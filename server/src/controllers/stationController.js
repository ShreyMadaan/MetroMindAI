require("../models/MetroLine");
const mongoose = require("mongoose");
const Station = require("../models/Station");

// ============================================
// GET /api/stations
// ============================================

const getAllStations = async (req, res, next) => {
  try {
    const stations = await Station.find({
      isActive: true,
    })
      .populate("lines", "code name color")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: stations.length,
      data: stations,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET /api/stations/search?q=rajiv
// ============================================

const searchStations = async (req, res, next) => {
  try {
    const query =
      typeof req.query.q === "string"
        ? req.query.q.trim()
        : "";

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Escape regex special characters
    const escapedQuery = query.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const stations = await Station.find({
      isActive: true,
      name: {
        $regex: escapedQuery,
        $options: "i",
      },
    })
      .populate("lines", "code name color")
      .sort({ name: 1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      count: stations.length,
      data: stations,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET /api/stations/:id
// ============================================

const getStationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid station ID",
      });
    }

    const station = await Station.findOne({
      _id: id,
      isActive: true,
    })
      .populate("lines", "code name color")
      .lean();

    if (!station) {
      return res.status(404).json({
        success: false,
        message: "Station not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: station,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStations,
  searchStations,
  getStationById,
};
