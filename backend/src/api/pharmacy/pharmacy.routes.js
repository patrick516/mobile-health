import { Router } from "express";
import {
  getBatches,
  receiveBatch,
  dispense,
  recordAdjustment,
  getRequests,
  createRequest,
  fulfillRequest,
  getAlerts,
  getTransactions,
  getSuppliers,
  createSupplier,
} from "./pharmacy.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { role } from "../../middleware/role.js";

const router = Router();
router.use(authenticate);

// Stock — pharmacist and above
router.get(
  "/batches",
  role("SUPER_ADMIN", "ADMIN", "DISTRICT_OFFICER", "NURSE", "PHARMACIST"),
  getBatches,
);
router.post(
  "/batches",
  role("SUPER_ADMIN", "ADMIN", "NURSE", "PHARMACIST"),
  receiveBatch,
);

// Dispensing
router.post(
  "/dispense",
  role("SUPER_ADMIN", "ADMIN", "NURSE", "PHARMACIST"),
  dispense,
);

// Adjustments — senior staff and pharmacists
router.post(
  "/adjustments",
  role("SUPER_ADMIN", "ADMIN", "DISTRICT_OFFICER", "PHARMACIST"),
  recordAdjustment,
);

// Pharmacy requests
router.get(
  "/requests",
  role("SUPER_ADMIN", "ADMIN", "DISTRICT_OFFICER", "NURSE", "PHARMACIST"),
  getRequests,
);
router.post(
  "/requests",
  role("SUPER_ADMIN", "ADMIN", "NURSE", "PHARMACIST"),
  createRequest,
);
router.patch(
  "/requests/:id/fulfill",
  role("SUPER_ADMIN", "ADMIN", "NURSE", "PHARMACIST"),
  fulfillRequest,
);

// Alerts and reports
router.get(
  "/alerts",
  role("SUPER_ADMIN", "ADMIN", "DISTRICT_OFFICER", "NURSE", "PHARMACIST"),
  getAlerts,
);
router.get(
  "/transactions",
  role("SUPER_ADMIN", "ADMIN", "DISTRICT_OFFICER", "NURSE", "PHARMACIST"),
  getTransactions,
);

// Suppliers
router.get("/suppliers", getSuppliers);
router.post(
  "/suppliers",
  role("SUPER_ADMIN", "ADMIN", "PHARMACIST"),
  createSupplier,
);

export default router;
