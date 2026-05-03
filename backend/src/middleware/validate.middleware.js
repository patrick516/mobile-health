// src/middleware/validate.middleware.js

import { error } from "../utils/response.js";

export const validate = (schema) => (req, res, next) => {
  const missing = [];

  for (const [field, rule] of Object.entries(schema)) {
    if (rule === "required" && !req.body[field]) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return error(
      res,
      `Missing required fields: ${missing.join(", ")}`,
      400,
      "VALIDATION_ERROR",
    );
  }

  next();
};
