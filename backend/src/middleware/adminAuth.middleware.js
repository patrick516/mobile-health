// src/middleware/adminAuth.middleware.js

import { verifyToken } from "../utils/jwt.js";
import { error } from "../utils/response.js";
import prisma from "../config/db.js";

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return error(res, "No token provided", 401, "UNAUTHORIZED");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    // Must be an admin token
    if (!decoded.isAdmin) {
      return error(res, "Admin access required", 403, "FORBIDDEN");
    }

    const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
    if (!admin || !admin.isActive) {
      return error(
        res,
        "Admin account not found or inactive",
        401,
        "UNAUTHORIZED",
      );
    }

    req.admin = admin;
    next();
  } catch (err) {
    return error(res, "Invalid or expired token", 401, "UNAUTHORIZED");
  }
};

// Only super_admin can access certain routes
export const requireSuperAdmin = (req, res, next) => {
  if (req.admin.role !== "super_admin") {
    return error(res, "Super admin access required", 403, "FORBIDDEN");
  }
  next();
};
