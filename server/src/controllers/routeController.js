
const {
  calculateRoute,
} = require("../services/graphService");

// GET /api/routes?source=...&destination=...&optimize=time
const getRoute = async (req, res, next) => {
  try {
    const { source, destination } = req.query;
    const optimize = req.query.optimize || "time";

    if (
      typeof source !== "string" ||
      !source.trim() ||
      typeof destination !== "string" ||
      !destination.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Source and destination are required",
      });
    }

    const result = await calculateRoute(
      source.trim().toUpperCase(),
      destination.trim().toUpperCase(),
      optimize
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRoute };
