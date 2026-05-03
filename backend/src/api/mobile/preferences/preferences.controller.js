// src/api/mobile/preferences/preferences.controller.js

import * as preferencesService from "./preferences.service.js";
import { success } from "../../../utils/response.js";

export const getPreferences = async (req, res, next) => {
  try {
    const preferences = await preferencesService.getPreferences(req.user.id);
    return success(res, { preferences });
  } catch (err) {
    next(err);
  }
};

export const updatePreferences = async (req, res, next) => {
  try {
    const preferences = await preferencesService.updatePreferences(
      req.user.id,
      req.body,
    );
    return success(res, { preferences });
  } catch (err) {
    next(err);
  }
};
