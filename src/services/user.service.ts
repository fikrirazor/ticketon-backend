import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { hashPassword, comparePassword } from "../utils/password.util";

export const updateProfile = async (
  userId: string,
  data: { name: string; email: string }
) => {
  // Check if email taken by other
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser && existingUser.id !== userId) {
    throw new AppError(409, "Email already taken");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      updatedAt: true,
    },
  });

  return user;
};

export const updatePassword = async (userId: string, data: any) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found");

  const isOldValid = await comparePassword(data.oldPassword, user.password);
  if (!isOldValid) throw new AppError(400, "Incorrect old password");

  const hashedPassword = await hashPassword(data.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
};
