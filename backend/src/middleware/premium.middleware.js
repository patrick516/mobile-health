import { error } from "../utils/response.js";

export const requirePremium = (req, res, next) => {
  if (!req.user?.isPremium) {
    return error(
      res,
      "This feature requires a Premium subscription",
      403,
      "PREMIUM_REQUIRED",
    );
  }
  next();
};
