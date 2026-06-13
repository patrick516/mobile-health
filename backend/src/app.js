import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler.js";

// Route imports
import authRoutes from "./api/auth/auth.routes.js";
import geographyRoutes from "./api/geography/geography.routes.js";
import householdsRoutes from "./api/households/households.routes.js";
import membersRoutes from "./api/members/members.routes.js";
import visitsRoutes from "./api/visits/visits.routes.js";
import referralsRoutes from "./api/referrals/referrals.routes.js";
import immunisationsRoutes from "./api/immunisations/immunisations.routes.js";
import drugsRoutes from "./api/drugs/drugs.routes.js";
import syncRoutes from "./api/sync/sync.routes.js";
import mapRoutes from "./api/map/map.routes.js";
import analyticsRoutes from "./api/analytics/analytics.routes.js";
import adminRoutes from "./api/admin/admin.routes.js";
import exportRoutes from "./api/export/export.routes.js";
import reportsRoutes from "./api/reports/reports.routes.js";

const app = express();

//  MIDDLEWARE
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

//  HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

//  ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/geography", geographyRoutes);
app.use("/api/households", householdsRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/visits", visitsRoutes);
app.use("/api/referrals", referralsRoutes);
app.use("/api/immunisations", immunisationsRoutes);
app.use("/api/drugs", drugsRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/reports", reportsRoutes);

//  404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

//  ERROR HANDLER
app.use(errorHandler);

export default app;
