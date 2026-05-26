import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

export const signToken = (userId, userRole) => {
  return jwt.sign({ userId, role: userRole }, SECRET, {
    expiresIn: EXPIRES_IN,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};
