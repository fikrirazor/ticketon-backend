import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { hashPassword, comparePassword } from "../utils/password.util";
import { generateToken } from "../utils/jwt.util";
import { AppError } from "../utils/error";
import { generateReferralCode } from "../utils/referral.util";
import { sendMail } from "../services/mail.service";
import {
  getForgotPasswordEmailTemplate,
  getWelcomeEmailTemplate,
} from "../utils/emailTemplates";
import crypto from "crypto";
import { logger } from "../utils/logger";

export const signUp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role, referredBy } = req.body;
    console.log("req.body", req.body);

    // 1. Check if referrer exists if code provided
    let referrerId = null;
    if (referredBy) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: referredBy },
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

    // 4. Create user and handle rewards in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
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

      // Handle rewards if referredBy was provided and valid
      if (referrerId) {
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

        // Referrer gets 10,000 points
        await tx.point.create({
          data: {
            userId: referrerId,
            amount: 10000,
            expiresAt: threeMonthsFromNow,
          },
        });

        // Referred user gets a discount coupon
        await tx.coupon.create({
          data: {
            userId: newUser.id,
            code: `REF-${newUser.id.substring(0, 8).toUpperCase()}`,
            discount: 10000, // Assuming 10k discount from the requirement context
            expiresAt: threeMonthsFromNow,
          },
        });
      }

      return newUser;
    });

    const user = result;

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Send Welcome Email
    sendMail(
      user.email,
      "Welcome to Ticketon!",
      getWelcomeEmailTemplate(user.name),
    ).catch((err) => logger.error("Welcome email failed:", err));

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

export const signIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email with points and coupons
    const user = await prisma.user.findUnique({
      where: { email },
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

    const totalPoints = user.points.reduce((sum: number, p: any) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      message: "Sign in successful",
      data: {
        user: {
          ...user,
          totalPoints,
          points: undefined,
          password: undefined,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(404, "User with this email does not exist");
    }

    // Generate random token (64 chars)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // Send email with reset link
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetLink = `${clientUrl}/reset-password?token=${resetToken}`;

    sendMail(
      user.email,
      "Tiketon - Reset Your Password",
      getForgotPasswordEmailTemplate(user.name, resetLink),
    ).catch((err) => logger.error("Forgot password email failed:", err));

    res.status(200).json({
      success: true,
      message: "Password reset link has been sent to your email.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError(400, "Password reset token is invalid or has expired");
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(error);
  }
};
