import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";

// ─── USERS ────────────────────────────────────────────────────────────────────
export const getUsers = async (req, res, next) => {
  try {
    const { role, isActive } = req.query;
    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
        zoneAllocations: { select: { zone: { include: { ta: true } } } },
        taAllocations: { select: { ta: true } },
      },
      orderBy: { fullName: "asc" },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { fullName, phoneNumber, pin, role } = req.body;
    if (!fullName || !phoneNumber || !pin || !role) {
      return res
        .status(400)
        .json({
          success: false,
          message: "fullName, phoneNumber, pin and role are required.",
        });
    }
    if (String(pin).length !== 4) {
      return res
        .status(400)
        .json({ success: false, message: "PIN must be 4 digits." });
    }
    const pinHash = await bcrypt.hash(String(pin), 12);
    const user = await prisma.user.create({
      data: { fullName, phoneNumber, pinHash, role },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { fullName, phoneNumber, role } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(fullName ? { fullName } : {}),
        ...(phoneNumber ? { phoneNumber } : {}),
        ...(role ? { role } : {}),
      },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        isActive: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
      select: { id: true, fullName: true, isActive: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ─── GEOGRAPHY ────────────────────────────────────────────────────────────────
export const createRegion = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Name is required." });
    const region = await prisma.region.create({ data: { name } });
    res.status(201).json({ success: true, data: region });
  } catch (err) {
    next(err);
  }
};

export const createDistrict = async (req, res, next) => {
  try {
    const { name, regionId } = req.body;
    if (!name || !regionId)
      return res
        .status(400)
        .json({ success: false, message: "name and regionId are required." });
    const district = await prisma.district.create({ data: { name, regionId } });
    res.status(201).json({ success: true, data: district });
  } catch (err) {
    next(err);
  }
};

export const createTA = async (req, res, next) => {
  try {
    const { name, districtId } = req.body;
    if (!name || !districtId)
      return res
        .status(400)
        .json({ success: false, message: "name and districtId are required." });
    const ta = await prisma.traditionalAuthority.create({
      data: { name, districtId },
    });
    res.status(201).json({ success: true, data: ta });
  } catch (err) {
    next(err);
  }
};

export const createZone = async (req, res, next) => {
  try {
    const { name, taId } = req.body;
    if (!name || !taId)
      return res
        .status(400)
        .json({ success: false, message: "name and taId are required." });
    const zone = await prisma.zone.create({ data: { name, taId } });
    res.status(201).json({ success: true, data: zone });
  } catch (err) {
    next(err);
  }
};

// ─── ALLOCATIONS ──────────────────────────────────────────────────────────────
export const allocateUserToZone = async (req, res, next) => {
  try {
    const { userId, zoneId } = req.body;
    if (!userId || !zoneId)
      return res
        .status(400)
        .json({ success: false, message: "userId and zoneId are required." });
    const allocation = await prisma.userZoneAllocation.upsert({
      where: { userId_zoneId: { userId, zoneId } },
      update: { allocatedById: req.user.id, allocatedAt: new Date() },
      create: { userId, zoneId, allocatedById: req.user.id },
    });
    res.status(201).json({ success: true, data: allocation });
  } catch (err) {
    next(err);
  }
};

export const allocateUserToTA = async (req, res, next) => {
  try {
    const { userId, taId } = req.body;
    if (!userId || !taId)
      return res
        .status(400)
        .json({ success: false, message: "userId and taId are required." });
    const allocation = await prisma.userTaAllocation.upsert({
      where: { userId_taId: { userId, taId } },
      update: { allocatedById: req.user.id, allocatedAt: new Date() },
      create: { userId, taId, allocatedById: req.user.id },
    });
    res.status(201).json({ success: true, data: allocation });
  } catch (err) {
    next(err);
  }
};

// ─── FACILITIES ───────────────────────────────────────────────────────────────
export const getFacilities = async (req, res, next) => {
  try {
    const facilities = await prisma.facility.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: facilities });
  } catch (err) {
    next(err);
  }
};

export const createFacility = async (req, res, next) => {
  try {
    const { name, gpsLat, gpsLng } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Facility name is required." });
    const facility = await prisma.facility.create({
      data: { name, gpsLat: gpsLat || null, gpsLng: gpsLng || null },
    });
    res.status(201).json({ success: true, data: facility });
  } catch (err) {
    next(err);
  }
};

// ─── DRUGS ────────────────────────────────────────────────────────────────────
export const createDrug = async (req, res, next) => {
  try {
    const { drugCode, nameEnglish, nameChichewa, unit, minimumThreshold } =
      req.body;
    if (
      !drugCode ||
      !nameEnglish ||
      !nameChichewa ||
      !unit ||
      !minimumThreshold
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All drug fields are required." });
    }
    const drug = await prisma.drug.create({
      data: {
        drugCode,
        nameEnglish,
        nameChichewa,
        unit,
        minimumThreshold: parseInt(minimumThreshold),
      },
    });
    res.status(201).json({ success: true, data: drug });
  } catch (err) {
    next(err);
  }
};

export const updateDrug = async (req, res, next) => {
  try {
    const drug = await prisma.drug.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: drug });
  } catch (err) {
    next(err);
  }
};
