// src/api/admin/locations/locations.routes.js

import { Router } from "express";
import {
  getCountries,
  createCountry,
  updateCountry,
  deleteCountry,
  getDistricts,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  getTowns,
  createTown,
  updateTown,
  deleteTown,
} from "./locations.controller.js";
import {
  authenticateAdmin,
  requireSuperAdmin,
} from "../../../middleware/adminAuth.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";

const router = Router();

// Countries
router.get("/countries", authenticateAdmin, getCountries);
router.post(
  "/countries",
  authenticateAdmin,
  validate({ code: "required", name: "required" }),
  createCountry,
);
router.patch("/countries/:code", authenticateAdmin, updateCountry);
router.delete(
  "/countries/:code",
  authenticateAdmin,
  requireSuperAdmin,
  deleteCountry,
);

// Districts
router.get("/districts/:countryCode", authenticateAdmin, getDistricts);
router.post(
  "/districts",
  authenticateAdmin,
  validate({ name: "required", countryCode: "required" }),
  createDistrict,
);
router.patch("/districts/:id", authenticateAdmin, updateDistrict);
router.delete(
  "/districts/:id",
  authenticateAdmin,
  requireSuperAdmin,
  deleteDistrict,
);

// Towns
router.get("/towns/:districtId", authenticateAdmin, getTowns);
router.post(
  "/towns",
  authenticateAdmin,
  validate({ name: "required", districtId: "required" }),
  createTown,
);
router.patch("/towns/:id", authenticateAdmin, updateTown);
router.delete("/towns/:id", authenticateAdmin, requireSuperAdmin, deleteTown);

export default router;
