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
} from "./admin.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { role } from "../../middleware/role.js";

const router = Router();
router.use(authenticate);
router.use(role("ADMIN"));

// Users
router.get("/users", getUsers);
router.post("/users", createUser);
router.patch("/users/:id", updateUser);
router.patch("/users/:id/deactivate", deactivateUser);
router.patch("/users/:id/reactivate", reactivateUser);
// Geography
router.post("/geography/regions", createRegion);
router.post("/geography/districts", createDistrict);
router.post("/geography/tas", createTA);
router.post("/geography/zones", createZone);

// Allocations
router.post("/allocations/zone", allocateUserToZone);
router.post("/allocations/ta", allocateUserToTA);

// Facilities
router.get("/facilities", getFacilities);
router.post("/facilities", createFacility);

// Drugs
router.post("/drugs", createDrug);
router.patch("/drugs/:id", updateDrug);

export default router;
