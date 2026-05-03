// src/api/admin/index.js

import { Router } from "express";
import authRoutes from "./auth/auth.routes.js";
import usersRoutes from "./users/users.routes.js";
import reportsRoutes from "./reports/reports.routes.js";
import photosRoutes from "./photos/photos.routes.js";
import matchesRoutes from "./matches/matches.routes.js";
import subscriptionsRoutes from "./subscriptions/subscriptions.routes.js";
import dashboardRoutes from "./dashboard/dashboard.routes.js";
import locationsRoutes from "./locations/locations.routes.js";
import notificationsRoutes from "./notifications/notifications.routes.js";
import verificationRoutes from "./verification/verification.routes.js";
import analyticsRoutes from "./analytics/analytics.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/reports", reportsRoutes);
router.use("/photos", photosRoutes);
router.use("/matches", matchesRoutes);
router.use("/subscriptions", subscriptionsRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/locations", locationsRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/verification", verificationRoutes);
router.use("/analytics", analyticsRoutes);

export default router;
