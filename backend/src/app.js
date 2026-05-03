// src/app.js

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import { defaultLimiter } from "./middleware/rateLimit.middleware.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import mobileRoutes from "./api/mobile/index.js";
import adminRoutes from "./api/admin/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── Security & parsing ───────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Logging ──────────────────────────────────────────
if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ── Rate limiting ────────────────────────────────────
app.use(defaultLimiter);

// ── Static files — serve uploaded photos/voice notes ─
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ── Health check ─────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    env: env.NODE_ENV,
    version: "1.0.0",
  });
});

// ── API Routes ───────────────────────────────────────
app.use("/api/mobile", mobileRoutes);
app.use("/api/admin", adminRoutes);

// ── 404 & Error handlers ─────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
