import prisma from "../../../config/db.js";
import { hashPassword, comparePassword } from "../../../utils/hash.js";
import { signToken } from "../../../utils/jwt.js";

export const register = async ({
  name,
  email,
  password,
  date_of_birth,
  gender,
  country,
  district,
  town,
}) => {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    const err = new Error("Email already in use");
    err.statusCode = 409;
    throw err;
  }

  const hashed = await hashPassword(password);

  let dob = null;
  if (date_of_birth) {
    const [day, month, year] = date_of_birth.split("/");
    dob = new Date(`${year}-${month}-${day}`);
    if (isNaN(dob.getTime())) {
      const err = new Error("Invalid date of birth format. Use DD/MM/YYYY");
      err.statusCode = 400;
      throw err;
    }
  }
  const age = dob ? Math.floor((Date.now() - dob) / 3.15576e10) : null;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      dateOfBirth: dob,
      age,
      gender,
      country,
      district,
      town,
    },
    select: {
      id: true,
      name: true,
      email: true,
      gender: true,
      createdAt: true,
    },
  });

  const token = signToken({ id: user.id });
  return { token, user };
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  const token = signToken({ id: user.id });
  const { password: _, ...safeUser } = user;
  return { token, user: safeUser };
};

export const refresh = async (user) => {
  const token = signToken({ id: user.id });
  return { token };
};

export const logout = async (userId) => {
  // Invalidate refresh tokens if using DB token store
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
};

export const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // silent — don't leak whether email exists

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: expires },
  });

  // TODO: send email with reset link containing token
  console.log(`[DEV] Password reset token for ${email}: ${token}`);
};

export const resetPassword = async ({ token, password }) => {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record || record.used || record.expiresAt < new Date()) {
    const err = new Error("Invalid or expired reset token");
    err.statusCode = 400;
    throw err;
  }

  const hashed = await hashPassword(password);
  await prisma.user.update({
    where: { id: record.userId },
    data: { password: hashed },
  });
  await prisma.passwordResetToken.update({
    where: { token },
    data: { used: true },
  });
};
