// src/api/admin/locations/locations.controller.js

import * as locationsService from "./locations.service.js";
import { success, created } from "../../../utils/response.js";

export const getCountries = async (req, res, next) => {
  try {
    return success(res, { countries: await locationsService.getCountries() });
  } catch (e) {
    next(e);
  }
};
export const createCountry = async (req, res, next) => {
  try {
    return created(res, {
      country: await locationsService.createCountry(req.body),
    });
  } catch (e) {
    next(e);
  }
};
export const updateCountry = async (req, res, next) => {
  try {
    return success(res, {
      country: await locationsService.updateCountry(req.params.code, req.body),
    });
  } catch (e) {
    next(e);
  }
};
export const deleteCountry = async (req, res, next) => {
  try {
    await locationsService.deleteCountry(req.params.code);
    return success(res, { message: "Country deleted" });
  } catch (e) {
    next(e);
  }
};

export const getDistricts = async (req, res, next) => {
  try {
    return success(res, {
      districts: await locationsService.getDistricts(req.params.countryCode),
    });
  } catch (e) {
    next(e);
  }
};
export const createDistrict = async (req, res, next) => {
  try {
    return created(res, {
      district: await locationsService.createDistrict(req.body),
    });
  } catch (e) {
    next(e);
  }
};
export const updateDistrict = async (req, res, next) => {
  try {
    return success(res, {
      district: await locationsService.updateDistrict(req.params.id, req.body),
    });
  } catch (e) {
    next(e);
  }
};
export const deleteDistrict = async (req, res, next) => {
  try {
    await locationsService.deleteDistrict(req.params.id);
    return success(res, { message: "District deleted" });
  } catch (e) {
    next(e);
  }
};

export const getTowns = async (req, res, next) => {
  try {
    return success(res, {
      towns: await locationsService.getTowns(req.params.districtId),
    });
  } catch (e) {
    next(e);
  }
};
export const createTown = async (req, res, next) => {
  try {
    return created(res, { town: await locationsService.createTown(req.body) });
  } catch (e) {
    next(e);
  }
};
export const updateTown = async (req, res, next) => {
  try {
    return success(res, {
      town: await locationsService.updateTown(req.params.id, req.body),
    });
  } catch (e) {
    next(e);
  }
};
export const deleteTown = async (req, res, next) => {
  try {
    await locationsService.deleteTown(req.params.id);
    return success(res, { message: "Town deleted" });
  } catch (e) {
    next(e);
  }
};
