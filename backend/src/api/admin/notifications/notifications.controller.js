// src/api/admin/notifications/notifications.controller.js

import * as notificationsService from "./notifications.service.js";
import { success, created } from "../../../utils/response.js";

export const getBroadcasts = async (req, res, next) => {
  try {
    const broadcasts = await notificationsService.getBroadcasts();
    return success(res, { broadcasts });
  } catch (err) {
    next(err);
  }
};

export const sendBroadcast = async (req, res, next) => {
  try {
    const result = await notificationsService.sendBroadcast(
      req.admin.id,
      req.body,
    );
    return created(res, { ...result, message: "Broadcast sent successfully" });
  } catch (err) {
    next(err);
  }
};
