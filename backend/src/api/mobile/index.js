import { Router } from "express";

import authRoutes from "./auth/auth.routes.js";
import usersRoutes from "./users/users.routes.js";
import discoverRoutes from "./discover/discover.routes.js";
import swipeRoutes from "./swipe/swipe.routes.js";
import matchesRoutes from "./matches/matches.routes.js";
import conversationsRoutes from "./conversations/conversations.routes.js";
import preferencesRoutes from "./preferences/preferences.routes.js";
import premiumRoutes from "./premium/premium.routes.js";
import notificationsRoutes from "./notifications/notifications.routes.js";
import searchRoutes from "./search/search.routes.js";
import locationsRoutes from "./locations/locations.routes.js";
import reportsRoutes from "./reports/reports.routes.js";
import photosRoutes from "./photos/photos.routes.js";
import verificationRoutes from "./verification/verification.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/discover", discoverRoutes);
router.use("/swipe", swipeRoutes);
router.use("/matches", matchesRoutes);
router.use("/conversations", conversationsRoutes);
router.use("/preferences", preferencesRoutes);
router.use("/premium", premiumRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/search", searchRoutes);
router.use("/locations", locationsRoutes);
router.use("/users", reportsRoutes);
router.use("/photos", photosRoutes);
router.use("/verification", verificationRoutes);

export default router;
