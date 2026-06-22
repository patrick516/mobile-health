import { Router } from "express";
import {
  getRegions,
  getDistricts,
  getTAs,
  getMyTAs,
  getZones,
  getVillages,
  createVillage,
  getGeographyTree,
  deleteVillage,
} from "./geography.controller.js";
import { authenticate } from "../../middleware/auth.js";
// import { role } from "../../middleware/role.js";

const router = Router();

router.use(authenticate);

router.get("/tree", getGeographyTree);
router.get("/regions", getRegions);
router.get("/districts", getDistricts);
router.get("/tas", getTAs);
router.get("/my-tas", getMyTAs);
router.get("/zones", getZones);
router.get("/villages", getVillages);
router.post("/villages", createVillage);
router.delete("/villages/:id", deleteVillage);

export default router;
