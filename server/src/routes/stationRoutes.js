
const express = require("express");

const {
  getAllStations,
  searchStations,
  getStationById,
} = require("../controllers/stationController");

const router = express.Router();

// Get all active metro stations
router.get("/", getAllStations);

// Search stations by name
router.get("/search", searchStations);

// Get station details by ID
router.get("/:id", getStationById);

module.exports = router;
