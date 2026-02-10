import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { AppError } from "../utils/error";
import { hashPassword } from "../utils/password.util";

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized");
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        points: {
          where: { expiresAt: { gt: new Date() }, amount: { gt: 0 } },
        },
        coupons: {
          where: { expiresAt: { gt: new Date() } },
        },
      },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const totalPoints = user.points.reduce((sum: number, p: any) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user: {
          ...user,
          totalPoints,
          points: undefined, // Hide raw points list if preferred, or keep it
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

import cloudinary from "../config/cloudinary.config";

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Unauthorized");
    }

    const { name, email, password } = req.body;
    let avatarUrl: string | undefined;

    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        folder: "ticketon/avatars",
      });
      avatarUrl = uploadResponse.secure_url;
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    if (password) {
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      include: {
        points: {
          where: { expiresAt: { gt: new Date() }, amount: { gt: 0 } },
        },
        coupons: {
          where: { expiresAt: { gt: new Date() } },
        },
      },
    });

    const totalPoints = updatedUser.points.reduce((sum: number, p: any) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          ...updatedUser,
          totalPoints,
          points: undefined,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { page, limit } = req.query; // ?page=1&limit=10
    const skip = (Number(page) - 1) * Number(limit) || 0;
    const take = Number(limit) || 10;
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take,
    });

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: { users, count: users.length },
      page: 1,
      limit: 10,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const organizer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        ratingSummary: true,
        createdAt: true,
        _count: {
          select: {
            events: { where: { deletedAt: null } },
            reviews: true,
          },
        },
      },
    });

    if (!organizer) {
      throw new AppError(404, "Organizer not found");
    }

    res.status(200).json({
      success: true,
      message: "Organizer profile retrieved successfully",
      data: {
        id: organizer.id,
        name: organizer.name,
        avatarUrl: organizer.avatarUrl,
        averageRating: organizer.ratingSummary,
        totalEvents: organizer._count.events,
        totalReviews: organizer._count.reviews,
        bio: "Kami adalah penyelenggara event profesional yang berfokus pada pengalaman musik dan teknologi terbaik. Menghadirkan inovasi dalam setiap pertunjukan.", // Fallback if no bio field in DB yet
      },
    });
  } catch (error) {
    next(error);
  }
};
