// src/api/mobile/locations/locations.routes.js

import { Router } from "express";
import {
  getCountries,
  getDistricts,
  getTowns,
} from "./locations.controller.js";

const router = Router();

// Public — no auth required
router.get("/countries", getCountries);
router.get("/districts/:countryCode", getDistricts);
router.get("/towns/:districtId", getTowns);

export default router;
