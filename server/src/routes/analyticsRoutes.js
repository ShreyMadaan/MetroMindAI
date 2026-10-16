
const express = require("express");

const {
  getNetworkAnalytics,
} = require("../controllers/analyticsController");

const router = express.Router();

// GET /api/analytics/network
router.get("/network", getNetworkAnalytics);

module.exports = router;
