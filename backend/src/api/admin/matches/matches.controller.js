// src/api/admin/matches/matches.controller.js

import * as matchesService from "./matches.service.js";
import { success } from "../../../utils/response.js";
import { getPagination } from "../../../utils/pagination.js";

export const getAllMatches = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const result = await matchesService.getAllMatches({ page, limit, skip });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

export const createManualMatch = async (req, res, next) => {
  try {
    const match = await matchesService.createManualMatch(
      req.body.user1Id,
      req.body.user2Id,
      req.admin.id,
    );
    return success(res, {
      match,
      message: "Match created and both users notified",
    });
  } catch (err) {
    next(err);
  }
};

export const dissolveMatch = async (req, res, next) => {
  try {
    await matchesService.dissolveMatch(req.params.id);
    return success(res, { message: "Match dissolved successfully" });
  } catch (err) {
    next(err);
  }
};
