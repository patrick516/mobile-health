// src/api/admin/photos/photos.routes.js

import { Router } from "express";
import { getUserPhotos, removePhoto } from "./photos.controller.js";
import { authenticateAdmin } from "../../../middleware/adminAuth.middleware.js";

const router = Router();

router.get("/user/:userId", authenticateAdmin, getUserPhotos);
router.delete("/:photoId", authenticateAdmin, removePhoto);

export default router;
