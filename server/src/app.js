
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const stationRoutes = require("./routes/stationRoutes");
const routeRoutes = require("./routes/routeRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const networkRoutes = require("./routes/networkRoutes");

const {
  notFound,
  errorHandler,
} = require("./middleware/errorMiddleware");

const app = express();

app.disable("x-powered-by");

// ============================================
// CORS Configuration
// ============================================

const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        Object.assign(new Error("CORS origin not allowed"), {
          status: 403,
        })
      );
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10kb" }));

// ============================================
// Health Check
// ============================================

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "MetroMind AI API is running",
    environment: process.env.NODE_ENV || "development",
  });
});

// ============================================
// API Routes
// ============================================

app.use("/api/auth", authRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/network", networkRoutes);

// ============================================
// Error Handling
// ============================================

app.use(notFound);
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

const PORT = Number(process.env.PORT) || 5000;

let server;
let shuttingDown = false;

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not configured");
    }

    await connectDB();

    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `MetroMind AI API running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
};

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received. Shutting down...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await mongoose.disconnect();

    console.log("Shutdown completed.");
    process.exit(0);
  } catch (error) {
    console.error("Shutdown failed:", error.message);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();
