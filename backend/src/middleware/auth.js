import { verifyToken } from "../utils/jwt.js";
import prisma from "../config/db.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        zoneAllocations: {
          select: { zoneId: true },
        },
        taAllocations: {
          select: { taId: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Token may be invalid.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been deactivated. Contact your administrator.",
      });
    }

    // Attach user + their allocated zone/TA IDs for scope checking
    req.user = {
      ...user,
      zoneIds: user.zoneAllocations.map((a) => a.zoneId),
      taIds: user.taAllocations.map((a) => a.taId),
    };

    next();
  } catch (err) {
    next(err);
  }
};
