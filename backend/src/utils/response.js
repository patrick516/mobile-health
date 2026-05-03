export const success = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, ...data });
};

export const created = (res, data = {}) => {
  return res.status(201).json({ success: true, ...data });
};

export const error = (
  res,
  message = "Something went wrong",
  statusCode = 500,
  code = null,
) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(code && { code }),
  });
};

export const paginated = (res, data, total, page, limit) => {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
};
