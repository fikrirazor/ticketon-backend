import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { AppError } from "../utils/error";
import { successResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { sendMail } from "../services/mail.service";
import { getApprovedEmailTemplate, getRejectedEmailTemplate } from "../utils/emailTemplates";
import cloudinary from "../config/cloudinary.config";

export const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { eventId, voucherId, couponId, pointsUsed, items } = req.body;
    const userId = req.user!.id;

    // 1. Fetch Event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError(404, "Event not found");
    }

    const quantity = items.reduce(
      (sum: number, item: { quantity: number }) => sum + item.quantity,
      0,
    );

    if (event.seatLeft < quantity) {
      throw new AppError(400, "Not enough seats available");
    }

    // 2. Calculate Base Price
    const totalPrice = event.price * quantity;
    let finalPrice = totalPrice;

    // 3. Apply Voucher Discount
    let voucher = null;
    if (voucherId) {
      voucher = await prisma.voucher.findUnique({
        where: { id: voucherId },
      });

      if (!voucher) {
        throw new AppError(404, "Voucher not found");
      }

      if (voucher.eventId !== eventId) {
        throw new AppError(400, "Voucher not applicable for this event");
      }

      const now = new Date();
      if (now < voucher.startDate || now > voucher.endDate) {
        throw new AppError(400, "Voucher is not active or has expired");
      }

      if (voucher.usedCount >= voucher.maxUsage) {
        throw new AppError(400, "Voucher usage limit reached");
      }

      if (voucher.discountAmount) {
        finalPrice -= voucher.discountAmount;
      } else if (voucher.discountPercent) {
        finalPrice -= (totalPrice * voucher.discountPercent) / 100;
      }
    }

    // 4. Apply Coupon Discount (System-wide coupons)
    let coupon = null;
    if (couponId) {
      coupon = await prisma.coupon.findUnique({
        where: { id: couponId },
      });

      if (!coupon) {
        throw new AppError(404, "Coupon not found");
      }

      if (new Date() > coupon.expiresAt) {
        throw new AppError(400, "Coupon has expired");
      }

      finalPrice -= coupon.discount;
    }

    // 4. Apply Points Discount
    if (pointsUsed > 0) {
      // Get valid points
      const validPoints = await prisma.point.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() },
          amount: { gt: 0 },
        },
        orderBy: { expiresAt: "asc" },
      });

      const totalValidPoints = validPoints.reduce((sum: number, p) => sum + p.amount, 0);

      if (totalValidPoints < pointsUsed) {
        throw new AppError(400, `Insufficient points. You only have ${totalValidPoints} points.`);
      }

      finalPrice -= pointsUsed;
    }

    if (finalPrice < 0) finalPrice = 0;

    // 5. Create Transaction with Status WAITING_PAYMENT
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // 2 hours expiration

    const transaction = await prisma.$transaction(async (tx) => {
      // Re-check seats inside transaction to avoid race conditions
      const currentEvent = await tx.event.findUnique({
        where: { id: eventId },
        select: { seatLeft: true },
      });

      if (!currentEvent || currentEvent.seatLeft < quantity) {
        throw new AppError(400, "Not enough seats available");
      }

      // Decrement seats
      await tx.event.update({
        where: { id: eventId },
        data: { seatLeft: { decrement: quantity } },
      });

      // Increment voucher usage
      if (voucherId) {
        await tx.voucher.update({
          where: { id: voucherId },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Deduct points
      if (pointsUsed > 0) {
        let remainingToDeduct = pointsUsed;
        const validPoints = await tx.point.findMany({
          where: {
            userId,
            expiresAt: { gt: new Date() },
            amount: { gt: 0 },
          },
          orderBy: { expiresAt: "asc" },
        });

        for (const pointRecord of validPoints) {
          if (remainingToDeduct <= 0) break;

          const deduction = Math.min(pointRecord.amount, remainingToDeduct);
          await tx.point.update({
            where: { id: pointRecord.id },
            data: { amount: { decrement: deduction } },
          });
          remainingToDeduct -= deduction;
        }
      }

      // Create transaction record
      return tx.transaction.create({
        data: {
          userId,
          eventId,
          voucherId,
          couponId,
          pointsUsed,
          totalPrice,
          finalPrice,
          status: "WAITING_PAYMENT",
          expiresAt,
          items: {
            create: items.map((item: { quantity: number }) => ({
              quantity: item.quantity,
              price: event.price,
            })),
          },
        },
        include: {
          items: true,
          event: true,
          voucher: true,
        },
      });
    });

    successResponse(
      res,
      "Transaction created successfully. Please upload payment proof within 2 hours.",
      transaction,
    );
  } catch (error) {
    logger.error("Error creating transaction", error);
    next(error);
  }
};

export const getTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: true,
        event: true,
        voucher: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new AppError(404, "Transaction not found");
    }

    const event = transaction.event;
    const isOwner = transaction.userId === userId;
    const isEventOrganizer = event?.organizerId === userId;
    if (!isOwner && !isEventOrganizer) {
      throw new AppError(403, "Not authorized to view this transaction");
    }

    successResponse(res, "Transaction retrieved successfully", transaction);
  } catch (error) {
    logger.error(`Error retrieving transaction ${req.params.id}`, error);
    next(error);
  }
};

export const getUserTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          event: true,
        },
      }),
      prisma.transaction.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    successResponse(res, "User transactions retrieved successfully", transactions, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    logger.error("Error retrieving user transactions", error);
    next(error);
  }
};

export const uploadPaymentProof = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    let { paymentProofUrl } = req.body;

    // Use uploaded file path from Cloudinary if available
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const uploadResponse = await cloudinary.uploader.upload(dataURI, {
        folder: "ticketon/transactions",
      });
      paymentProofUrl = uploadResponse.secure_url;
    }

    if (!paymentProofUrl) {
      throw new AppError(400, "Payment proof file or URL is required");
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new AppError(404, "Transaction not found");
    }

    if (transaction.userId !== userId) {
      throw new AppError(403, "Not authorized to update this transaction");
    }

    if (transaction.status !== "WAITING_PAYMENT") {
      throw new AppError(
        400,
        `Cannot upload proof for transaction with status ${transaction.status}`,
      );
    }

    if (new Date() > transaction.expiresAt) {
      // Should ideally be handled by cron, but good to check here too
      throw new AppError(400, "Transaction has expired");
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        paymentProofUrl,
        status: "WAITING_ADMIN",
      },
    });

    successResponse(
      res,
      "Payment proof submitted successfully. Waiting for admin verification.",
      updatedTransaction,
    );
  } catch (error) {
    logger.error(`Error uploading payment proof for transaction ${req.params.id}`, error);
    next(error);
  }
};

export const cancelTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!transaction) {
      throw new AppError(404, "Transaction not found");
    }

    if (transaction.userId !== userId) {
      throw new AppError(403, "Not authorized to cancel this transaction");
    }

    if (transaction.status !== "WAITING_PAYMENT" && transaction.status !== "WAITING_ADMIN") {
      throw new AppError(400, `Cannot cancel transaction with status ${transaction.status}`);
    }

    // Rollback logic
    await prisma.$transaction(async (tx) => {
      // 1. Restore seats
      const quantity = transaction.items.reduce((sum: number, item) => sum + item.quantity, 0);
      await tx.event.update({
        where: { id: transaction.eventId },
        data: { seatLeft: { increment: quantity } },
      });

      // 2. Restore points (add 90 days to avoid setMonth overflow on month-end)
      if (transaction.pointsUsed > 0) {
        const restoreExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        await tx.point.create({
          data: {
            userId: transaction.userId,
            amount: transaction.pointsUsed,
            expiresAt: restoreExpiresAt,
          },
        });
      }

      // 3. Restore voucher usage
      if (transaction.voucherId) {
        await tx.voucher.update({
          where: { id: transaction.voucherId },
          data: { usedCount: { decrement: 1 } },
        });
      }

      // 4. Restore coupon (re-create it if it was fully consumed? Actually coupons in this schema seem to be one-time use or general.
      // If it's a specific user coupon, we should return it.
      // Current schema for Coupon doesn't have userId. It seems to be a general code.
      // If it's general, rollback is just "not counting it as used", but we don't track usedCount for Coupon yet.
      // If the requirement says rollback coupon, and we use them, we should probably follow the point logic for user-specific coupons.

      // 5. Update status
      await tx.transaction.update({
        where: { id },
        data: { status: "CANCELED" },
      });
    });

    successResponse(res, "Transaction canceled successfully. Seats and points have been restored.");
  } catch (error) {
    logger.error(`Error canceling transaction ${req.params.id}`, error);
    next(error);
  }
};

export const approveTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!transaction) {
      throw new AppError(404, "Transaction not found");
    }

    if (transaction.event.organizerId !== userId) {
      throw new AppError(403, "Not authorized to approve this transaction");
    }

    if (transaction.status !== "WAITING_ADMIN") {
      throw new AppError(400, `Transaction must be in WAITING_ADMIN status to be approved`);
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: { status: "DONE" },
      include: {
        user: true,
        event: true,
      },
    });

    // Send Approval Email
    const priceFormatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(updatedTransaction.finalPrice);

    sendMail(
      updatedTransaction.user.email,
      "Tiketon - Tiket Anda Telah Terkonfirmasi!",
      getApprovedEmailTemplate(
        updatedTransaction.user.name,
        updatedTransaction.event.title,
        priceFormatted,
      ),
    ).catch((err) => logger.error("Async email send failed:", err));

    successResponse(res, "Transaction approved successfully", updatedTransaction);
  } catch (error) {
    logger.error(`Error approving transaction ${req.params.id}`, error);
    next(error);
  }
};

export const rejectTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { event: true, items: true },
    });

    if (!transaction) {
      throw new AppError(404, "Transaction not found");
    }

    if (transaction.event.organizerId !== userId) {
      throw new AppError(403, "Not authorized to reject this transaction");
    }

    if (transaction.status !== "WAITING_ADMIN" && transaction.status !== "WAITING_PAYMENT") {
      throw new AppError(400, `Cannot reject transaction with status ${transaction.status}`);
    }

    // Rollback logic (copied/adapted from cancelTransaction)
    const transactionWithInfo = await prisma.$transaction(async (tx) => {
      // 1. Restore seats
      const quantity = transaction.items.reduce((sum: number, item) => sum + item.quantity, 0);
      await tx.event.update({
        where: { id: transaction.eventId },
        data: { seatLeft: { increment: quantity } },
      });

      // 2. Restore points
      if (transaction.pointsUsed > 0) {
        const restoreExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        await tx.point.create({
          data: {
            userId: transaction.userId,
            amount: transaction.pointsUsed,
            expiresAt: restoreExpiresAt,
          },
        });
      }

      // 3. Restore voucher usage
      if (transaction.voucherId) {
        await tx.voucher.update({
          where: { id: transaction.voucherId },
          data: { usedCount: { decrement: 1 } },
        });
      }

      // 4. Update status
      const updated = await tx.transaction.update({
        where: { id },
        data: { status: "REJECTED" },
        include: {
          user: true,
          event: true,
        },
      });

      return updated;
    });

    // Send Rejection Email
    sendMail(
      transactionWithInfo.user.email,
      "Tiketon - Transaksi Dibatalkan",
      getRejectedEmailTemplate(transactionWithInfo.user.name, transactionWithInfo.event.title),
    ).catch((err) => logger.error("Async email send failed:", err));

    successResponse(res, "Transaction rejected successfully. Seats and points have been restored.");
  } catch (error) {
    logger.error(`Error rejecting transaction ${req.params.id}`, error);
    next(error);
  }
};
