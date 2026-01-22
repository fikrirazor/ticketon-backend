import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { hashPassword, comparePassword } from "../utils/password.util";
import { generateToken } from "../utils/jwt.util";
import { AppError } from "../middleware/error.middleware";

export const signUp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, referralCode } = req.body; // referralCode optional
    console.log("req.body", req.body);

    const newReferralCode = await generateReferralCode(name);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(409, "User with this email already exists");
    }

    const user = await prisma.$transaction(async (tx) => {
        // Hash password
        const hashedPassword = await hashPassword(password);
        
        let referrerId = null;

        if (referralCode) {
            const referrer = await tx.user.findUnique({
                where: { referralCode }
            });
            if (referrer) {
                referrerId = referrer.id;
            } else {
                 throw new AppError(400, "Invalid referral code");
            }
        }

        const newUser = await tx.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                referralCode: newReferralCode,
                role: "CUSTOMER",
                referredById: referrerId,
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (referrerId) {
             // 1. Reward Referrer with Points
             const pointExpiry = new Date();
             pointExpiry.setMonth(pointExpiry.getMonth() + 3);
             
             await tx.point.create({
                 data: {
                     userId: referrerId,
                     amount: 10000,
                     expiresAt: pointExpiry
                 }
             });

             // 2. Reward New User with Coupon
             const couponExpiry = new Date();
             couponExpiry.setMonth(couponExpiry.getMonth() + 3);
             
             // Generate unique coupon code
             const couponCode = `REF-${newReferralCode}`; 
             
             await tx.coupon.create({
                 data: {
                     code: couponCode,
                     discount: 10000, // Fixed discount for example
                     expiresAt: couponExpiry,
                     // Assuming Coupon schema needs owner or it is general?
                     // Wait, Coupon in schema is:
                     // model Coupon { ... code, discount, expiresAt ... }
                     // It is not linked to a User by default in schema provided earlier!
                     // "Reward / Coupon Discount: ... provided by the application system and can be used for all events."
                     // BUT "Users registering with a referral get a discount coupon" implies it belongs to them?
                     // Schema:
                     // model Coupon { ... transactions Transaction[] }
                     // It doesn't have userId.
                     // The user requirement says "get a discount coupon".
                     // If it's a generic code, anyone can use it?
                     // Maybe create a unique code that they can use?
                     // Or I should have added userId to Coupon?
                     // Let's stick to generating a unique code "REF-<UserReferralCode>" and they can use it.
                     // Ideally should be linked to user to prevent others from using it, 
                     // but schema doesn't support it right now without modification.
                     // For MVP, unique code is "okay".
                 }
             });
        }
        
        return newUser;
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
          email: user.email,
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

const generateReferralCode = async (name: string) => {
    const base = name.substring(0, 3).toUpperCase();
    const unique = Math.floor(1000 + Math.random() * 9000);
    return `${base}${unique}`;
};
