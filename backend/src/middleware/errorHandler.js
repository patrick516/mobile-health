export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);

  // Prisma known errors
  if (err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
      field: err.meta?.target,
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found.",
    });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired. Please log in again.",
    });
  }

  // Catch-all for any other Prisma errors (validation errors, connection
  // errors, etc.) — never leak raw query/table details to the client.
  if (err.name?.startsWith("Prisma")) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }

  // Default — for genuinely unknown errors, still avoid leaking internals
  // unless we've explicitly marked them safe with err.status.
  res.status(err.status || 500).json({
    success: false,
    message: err.status
      ? err.message
      : "Something went wrong. Please try again.",
  });
};
