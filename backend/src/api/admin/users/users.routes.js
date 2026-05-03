// src/api/admin/users/users.routes.js

import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  verifyUser,
  suspendUser,
  banUser,
  unbanUser,
  deleteUser,
  grantPremium,
  revokePremium,
} from "./users.controller.js";
import {
  authenticateAdmin,
  requireSuperAdmin,
} from "../../../middleware/adminAuth.middleware.js";

const router = Router();

router.get("/", authenticateAdmin, getAllUsers);
router.get("/:id", authenticateAdmin, getUserById);
router.patch("/:id", authenticateAdmin, updateUser);
router.patch("/:id/verify", authenticateAdmin, verifyUser);
router.patch("/:id/suspend", authenticateAdmin, suspendUser);
router.patch("/:id/ban", authenticateAdmin, banUser);
router.patch("/:id/unban", authenticateAdmin, unbanUser);
router.delete("/:id", authenticateAdmin, requireSuperAdmin, deleteUser);
router.post("/:id/premium", authenticateAdmin, grantPremium);
router.delete("/:id/premium", authenticateAdmin, revokePremium);

export default router;
