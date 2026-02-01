import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { hashPassword, comparePassword } from "../utils/password.util";
import { generateToken } from "../utils/jwt.util";
import { AppError } from "../utils/error";
import { generateReferralCode } from "../utils/referral.util";

export const signUp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, role, referredBy } = req.body;
    console.log("req.body", req.body);

    // 1. Check if referrer exists if code provided
    let referrerId = null;
    if (referredBy) {
        const referrer = await prisma.user.findUnique({
            where: { referralCode: referredBy }
        });
        if (referrer) {
            referrerId = referrer.id;
        }
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(409, "User with this email already exists");
    }

    // 3. Hash password
    const hashedPassword = await hashPassword(password);

    // 4. Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "CUSTOMER",
        referralCode: generateReferralCode(),
        referredById: referrerId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        referralCode: true,
        referredById: true,
        ratingSummary: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const signIn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password");
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: "Sign in successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
          ratingSummary: (user as any).ratingSummary ?? 0,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};
