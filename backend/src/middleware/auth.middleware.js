import { verifyToken } from "../utils/jwt.js";
import { error } from "../utils/response.js";
import prisma from "../config/db.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return error(res, "No token provided", 401, "UNAUTHORIZED");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return error(res, "User not found", 401, "UNAUTHORIZED");

    req.user = user;
    next();
  } catch (err) {
    return error(res, "Invalid or expired token", 401, "UNAUTHORIZED");
  }
};
