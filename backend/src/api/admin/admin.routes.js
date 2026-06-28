import { Router } from "express";
import {
  getUsers,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  createRegion,
  createDistrict,
  createTA,
  createZone,
  allocateUserToZone,
  allocateUserToTA,
  createFacility,
  getFacilities,
  createDrug,
  updateDrug,
  getSecurityAlerts,
  unlockUser,
} from "./admin.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { role } from "../../middleware/role.js";

const router = Router();
router.use(authenticate);

// ─── SUPER_ADMIN only ─────────────────────────────────────────────────────────
router.get("/users", role("SUPER_ADMIN", "ADMIN"), getUsers);
router.post("/users", role("SUPER_ADMIN", "ADMIN"), createUser);
router.patch("/users/:id", role("SUPER_ADMIN", "ADMIN"), updateUser);
router.patch(
  "/users/:id/deactivate",
  role("SUPER_ADMIN", "ADMIN"),
  deactivateUser,
);
router.patch(
  "/users/:id/reactivate",
  role("SUPER_ADMIN", "ADMIN"),
  reactivateUser,
);

// Geography — regions and districts are SUPER_ADMIN only
router.post("/geography/regions", role("SUPER_ADMIN"), createRegion);
router.post("/geography/districts", role("SUPER_ADMIN"), createDistrict);

// TAs and Zones — ADMIN can add within their facility scope
router.post("/geography/tas", role("SUPER_ADMIN", "ADMIN"), createTA);
router.post("/geography/zones", role("SUPER_ADMIN", "ADMIN"), createZone);

// Allocations — ADMIN can allocate within their scope
router.post(
  "/allocations/zone",
  role("SUPER_ADMIN", "ADMIN"),
  allocateUserToZone,
);
router.post("/allocations/ta", role("SUPER_ADMIN", "ADMIN"), allocateUserToTA);

// Facilities — SUPER_ADMIN manages facilities
router.get("/facilities", role("SUPER_ADMIN", "ADMIN"), getFacilities);
router.post("/facilities", role("SUPER_ADMIN"), createFacility);

// Drugs — SUPER_ADMIN manages drug catalogue
router.post("/drugs", role("SUPER_ADMIN"), createDrug);
router.patch("/drugs/:id", role("SUPER_ADMIN"), updateDrug);

// Security — SUPER_ADMIN only
router.get("/security/alerts", role("SUPER_ADMIN"), getSecurityAlerts);
router.patch("/security/unlock/:id", role("SUPER_ADMIN"), unlockUser);

export default router;
