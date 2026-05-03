// src/api/admin/auth/auth.service.js

import prisma from "../../../config/db.js";
import { comparePassword } from "../../../utils/hash.js";
import { signToken } from "../../../utils/jwt.js";

export const adminLogin = async ({ email, password }) => {
  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin || !admin.isActive) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const valid = await comparePassword(password, admin.password);
  if (!valid) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  // Update last login
  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signToken({ id: admin.id, role: admin.role, isAdmin: true });
  const { password: _, ...safeAdmin } = admin;

  return { token, admin: safeAdmin };
};
