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
    const { name, email, password, role, referralCode: usedReferralCode } = req.body;
    console.log("req.body", req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(409, "User with this email already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // 1. Handle referral if provided
    let referrer = null;
    if (usedReferralCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode: usedReferralCode },
      });
      if (!referrer) {
        throw new AppError(400, "Invalid referral code");
      }
    }

    // 2. Generate new referral code for this user
    const newUserReferralCode = generateReferralCode();

    // 3. Create user and rewards in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || "CUSTOMER",
          referralCode: newUserReferralCode,
          referredById: referrer ? referrer.id : null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          referralCode: true,
          referredById: true,
          createdAt: true,
          updatedAt: true,
          ratingSummary: true,
        },
      });

      // If registered with referral, give rewards
      if (referrer) {
        // Give referrer 10,000 points
        await tx.point.create({
          data: {
            userId: referrer.id,
            amount: 10000,
            expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 3)), // 3 months from now
          },
        });

        // Give new user 10% discount coupon
        // Since Coupon doesn't have userId in schema, we'll prefix code with user ID or email
        // or just create a general coupon. For this project, a common way is to have 
        // a code that is recognizable or linked in some way.
        // Given the schema lacks userId in Coupon, we will just create one with a unique code.
        await tx.coupon.create({
          data: {
            code: `REF-${user.id.substring(0, 8)}`,
            discount: 10, // 10%
            expiresAt: new Date(new Date().setMonth(new Date().getMonth() + 3)),
          },
        });
      }

      return user;
    });

    // Generate JWT token
    const token = generateToken({
      userId: result.id,
      email: result.email,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: result,
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
          ratingSummary: user.ratingSummary,
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
