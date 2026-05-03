// src/api/mobile/search/search.controller.js

import * as searchService from "./search.service.js";
import { success, error } from "../../../utils/response.js";
import { getPagination } from "../../../utils/pagination.js";

export const search = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return error(
        res,
        "Search query (q) is required",
        400,
        "VALIDATION_ERROR",
      );
    }

    const { page, limit, skip } = getPagination(req.query);
    const result = await searchService.search(q.trim(), req.user.id, {
      page,
      limit,
      skip,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};
