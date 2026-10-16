
const express = require("express");
const {
  getNetworkMap,
} = require("../controllers/networkController");

const router = express.Router();

router.get("/map", getNetworkMap);

module.exports = router;
