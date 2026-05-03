// src/api/admin/locations/locations.service.js

import prisma from "../../../config/db.js";

// ── Countries ──────────────────────────────────────────
export const getCountries = () =>
  prisma.country.findMany({ orderBy: { name: "asc" } });

export const createCountry = ({ code, name, flag }) =>
  prisma.country.create({ data: { code: code.toUpperCase(), name, flag } });

export const updateCountry = (code, { name, flag, active }) =>
  prisma.country.update({
    where: { code: code.toUpperCase() },
    data: {
      ...(name !== undefined && { name }),
      ...(flag !== undefined && { flag }),
      ...(active !== undefined && { active }),
    },
  });

export const deleteCountry = (code) =>
  prisma.country.delete({ where: { code: code.toUpperCase() } });

// ── Districts ──────────────────────────────────────────
export const getDistricts = (countryCode) =>
  prisma.district.findMany({
    where: { countryCode: countryCode.toUpperCase() },
    orderBy: { name: "asc" },
  });

export const createDistrict = ({ name, countryCode }) =>
  prisma.district.create({
    data: { name, countryCode: countryCode.toUpperCase() },
  });

export const updateDistrict = (id, { name }) =>
  prisma.district.update({ where: { id }, data: { ...(name && { name }) } });

export const deleteDistrict = (id) => prisma.district.delete({ where: { id } });

// ── Towns ──────────────────────────────────────────────
export const getTowns = (districtId) =>
  prisma.town.findMany({ where: { districtId }, orderBy: { name: "asc" } });

export const createTown = ({ name, districtId }) =>
  prisma.town.create({ data: { name, districtId } });

export const updateTown = (id, { name }) =>
  prisma.town.update({ where: { id }, data: { ...(name && { name }) } });

export const deleteTown = (id) => prisma.town.delete({ where: { id } });
