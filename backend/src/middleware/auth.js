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
        facilityId: true,
        facility: {
          select: {
            id: true,
            name: true,
            facilityType: true,
            districtId: true,
            taId: true,
          },
        },
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

    // ─── Compute data scope based on role + facility ───
    // scopeLevel: "ALL" | "DISTRICT" | "TA" | "ZONE"
    let scopeLevel = "ALL";
    let districtId = null;
    let taIds = user.taAllocations.map((a) => a.taId); // legacy fallback
    let zoneIds = user.zoneAllocations.map((a) => a.zoneId);

    if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
      scopeLevel = "ALL";
    } else if (user.role === "CCW") {
      scopeLevel = "ZONE";
    } else if (user.facility) {
      if (user.facility.facilityType === "DISTRICT_HOSPITAL") {
        scopeLevel = "DISTRICT";
        districtId = user.facility.districtId;
      } else if (
        user.facility.facilityType === "TA_HOSPITAL" ||
        user.facility.facilityType === "CLINIC"
      ) {
        scopeLevel = "TA";
        taIds = user.facility.taId ? [user.facility.taId] : [];
      }
    } else if (taIds.length > 0) {
      // Legacy allocation-based nurse/DO with no facility assigned yet
      scopeLevel = "TA";
    }

    req.user = {
      ...user,
      scopeLevel,
      districtId,
      taIds,
      zoneIds,
    };

    next();
  } catch (err) {
    next(err);
  }
};

export const buildVillageScope = (user, requestedTaId) => {
  if (user.scopeLevel === "ALL") return {};

  if (user.scopeLevel === "DISTRICT") {
    if (!user.districtId) return { id: "__no_match__" };
    if (requestedTaId) {
      return {
        zone: { ta: { id: requestedTaId, districtId: user.districtId } },
      };
    }
    return { zone: { ta: { districtId: user.districtId } } };
  }

  if (user.scopeLevel === "TA") {
    // Empty taIds — show nothing
    if (!user.taIds || user.taIds.length === 0) return { id: "__no_match__" };
    return { zone: { taId: { in: user.taIds } } };
  }

  if (user.scopeLevel === "ZONE") {
    // Empty zoneIds — CCW not yet allocated, show nothing
    if (!user.zoneIds || user.zoneIds.length === 0)
      return { id: "__no_match__" };
    return { zone: { id: { in: user.zoneIds } } };
  }

  // No recognizable scope — show nothing rather than leak data
  return { id: "__no_match__" };
};
