import * as discoverService from "./discover.service.js";
import { success } from "../../../utils/response.js";
import { getPagination } from "../../../utils/pagination.js";

export const getDiscover = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { lat, lng } = req.query;
    const result = await discoverService.getDiscover(req.user, {
      page,
      limit,
      skip,
      lat,
      lng,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const getForYou = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const result = await discoverService.getForYou(req.user, {
      ...req.query,
      page,
      limit,
      skip,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};
