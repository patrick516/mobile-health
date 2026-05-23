// src/api/mobile/matches/matches.controller.js

import * as matchesService from "./matches.service.js";
import { success } from "../../../utils/response.js";

export const getMatches = async (req, res, next) => {
  try {
    const matches = await matchesService.getMatches(req.user.id);
    return success(res, { matches });
  } catch (err) {
    next(err);
  }
};

export const getMatchWithUser = async (req, res, next) => {
  try {
    const match = await matchesService.getMatchWithUser(
      req.user.id,
      req.params.userId,
    );
    return success(res, { match });
  } catch (err) {
    next(err);
  }
};

export const getLikesReceived = async (req, res, next) => {
  try {
    const likes = await matchesService.getLikesReceived(req.user.id);
    return success(res, { likes });
  } catch (err) {
    next(err);
  }
};

export const getLikesSent = async (req, res, next) => {
  try {
    const likes = await matchesService.getLikesSent(req.user.id);
    return success(res, { likes });
  } catch (err) {
    next(err);
  }
};
