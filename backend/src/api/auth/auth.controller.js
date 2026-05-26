import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";
import { signToken } from "../../utils/jwt.js";

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { phoneNumber, pin } = req.body;

    if (!phoneNumber || !pin) {
      return res.status(400).json({
        success: false,
        message: "Phone number and PIN are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      include: {
        zoneAllocations: {
          select: {
            zone: {
              include: {
                ta: { include: { district: { include: { region: true } } } },
              },
            },
          },
        },
        taAllocations: {
          select: {
            ta: { include: { district: { include: { region: true } } } },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or PIN.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Contact your administrator.",
      });
    }

    const pinMatch = await bcrypt.compare(String(pin), user.pinHash);
    if (!pinMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone number or PIN.",
      });
    }

    const token = signToken(user.id, user.role);

    const { pinHash, ...userSafe } = user;

    res.json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: userSafe,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        zoneAllocations: {
          select: {
            zone: {
              include: {
                ta: {
                  include: {
                    district: { include: { region: true } },
                  },
                },
              },
            },
          },
        },
        taAllocations: {
          select: {
            ta: {
              include: {
                district: { include: { region: true } },
              },
            },
          },
        },
      },
    });

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/auth/change-pin
export const changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;

    if (!currentPin || !newPin) {
      return res.status(400).json({
        success: false,
        message: "Current PIN and new PIN are required.",
      });
    }

    if (String(newPin).length !== 4 || isNaN(newPin)) {
      return res.status(400).json({
        success: false,
        message: "PIN must be exactly 4 digits.",
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const match = await bcrypt.compare(String(currentPin), user.pinHash);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Current PIN is incorrect.",
      });
    }

    const pinHash = await bcrypt.hash(String(newPin), 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { pinHash } });

    res.json({ success: true, message: "PIN changed successfully." });
  } catch (err) {
    next(err);
  }
};
