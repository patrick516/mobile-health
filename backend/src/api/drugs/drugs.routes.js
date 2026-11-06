import { Router } from "express";
import {
  getDrugs,
  getStock,
  updateStock,
  createStockRequest,
  getStockRequests,
  updateStockRequest,
} from "./drugs.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { role } from "../../middleware/role.js";

const router = Router();
router.use(authenticate);

router.get("/", getDrugs);
router.get("/stock", getStock);
router.patch(
  "/stock/:drugId",
  role("SUPER_ADMIN", "ADMIN", "NURSE", "DISTRICT_OFFICER", "PHARMACIST"),
  updateStock,
);
router.post("/requests", createStockRequest);
router.get("/requests", getStockRequests);
router.patch(
  "/requests/:id",
  role("SUPER_ADMIN", "ADMIN", "NURSE", "DISTRICT_OFFICER", "PHARMACIST"),
  updateStockRequest,
);

export default router;
