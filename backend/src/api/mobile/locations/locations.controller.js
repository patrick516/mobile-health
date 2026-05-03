// src/api/mobile/locations/locations.controller.js

import * as locationsService from "./locations.service.js";
import { success } from "../../../utils/response.js";

export const getCountries = async (req, res, next) => {
  try {
    const countries = await locationsService.getCountries();
    return success(res, { countries });
  } catch (err) {
    next(err);
  }
};

export const getDistricts = async (req, res, next) => {
  try {
    const districts = await locationsService.getDistricts(
      req.params.countryCode,
    );
    return success(res, { districts });
  } catch (err) {
    next(err);
  }
};

export const getTowns = async (req, res, next) => {
  try {
    const towns = await locationsService.getTowns(req.params.districtId);
    return success(res, { towns });
  } catch (err) {
    next(err);
  }
};
