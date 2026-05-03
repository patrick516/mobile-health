// src/api/mobile/locations/locations.service.js

import prisma from "../../../config/db.js";

export const getCountries = () => {
  return prisma.country.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { code: true, name: true, flag: true },
  });
};

export const getDistricts = (countryCode) => {
  return prisma.district.findMany({
    where: { countryCode: countryCode.toUpperCase() },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
};

export const getTowns = (districtId) => {
  return prisma.town.findMany({
    where: { districtId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
};
