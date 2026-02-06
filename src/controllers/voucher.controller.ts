import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { AppError } from "../utils/error";
import { successResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";

export const createVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { code, discountAmount, discountPercent, maxUsage, startDate, endDate } = req.body;
    const user = req.user!;

    // Check if event exists and belongs to user
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError(404, "Event not found");
    }

    if (event.organizerId !== user.id) {
      throw new AppError(403, "Not authorized to create vouchers for this event");
    }

    // Check if code already exists
    const existingVoucher = await prisma.voucher.findUnique({
      where: { code },
    });

    if (existingVoucher) {
      throw new AppError(400, "Voucher code already exists");
    }

    const voucher = await prisma.voucher.create({
      data: {
        code,
        eventId,
        discountAmount,
        discountPercent,
        maxUsage,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    successResponse(res, "Voucher created successfully", voucher);
  } catch (error) {
    logger.error("Error creating voucher", error);
    next(error);
  }
};

export const getVouchersByEvent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const user = req.user!;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError(404, "Event not found");
    }

    // Optional: Only organizer can see all vouchers? Or public?
    // Usually public can't see all vouchers unless they are public.
    // Assuming for management purposes (Organizer) based on context.
    // But maybe users can see them if listed? Sticking to organizer for management.
    if (event.organizerId !== user.id) {
      // If we want public availability, we can remove this.
      // But "Voucher Management" sounds like admin/organizer feature.
      // I'll restrict it for now.
      throw new AppError(403, "Not authorized to view vouchers for this event");
    }

    const vouchers = await prisma.voucher.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
    });

    successResponse(res, "Vouchers retrieved successfully", vouchers);
  } catch (error) {
    logger.error("Error retrieving vouchers", error);
    next(error);
  }
};

export const validateVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { code } = req.params;
    const { eventId } = req.query; // amount could be used for calculating total discount value if needed

    const voucher = await prisma.voucher.findUnique({
      where: { code },
      include: { event: true },
    });

    if (!voucher) {
      throw new AppError(404, "Voucher invalid");
    }

    const now = new Date();

    // Expiration checks
    if (now < voucher.startDate) {
      throw new AppError(400, "Voucher is not yet active");
    }

    if (now > voucher.endDate) {
      throw new AppError(400, "Voucher has expired");
    }

    // Usage checks
    if (voucher.usedCount >= voucher.maxUsage) {
      throw new AppError(400, "Voucher usage limit reached");
    }

    // Event mismatch check
    if (eventId && voucher.eventId !== eventId) {
      throw new AppError(400, "Voucher not applicable for this event");
    }

    // If passed validation
    successResponse(res, "Voucher is valid", {
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discountAmount: voucher.discountAmount,
        discountPercent: voucher.discountPercent,
        eventId: voucher.eventId,
        eventName: voucher.event.title,
      },
    });
  } catch (error) {
    // If we want to return 200 with valid:false instead of 400 error:
    // User requirement just says "Validasi voucher kode". usually APIs return 4xx for invalid.
    // However, for a user typing a code, 200 OK with { valid: false, message: ... } is sometimes preferred.
    // I will stick to AppError for consistency with other controllers, but maybe catch it?
    // Let's stick to standard error response which usually returns success: false.
    // logger.error("Error validating voucher", error);
    next(error);
  }
};

export const updateVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user!;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: { event: true }, // Need event to check organizer
    });

    if (!voucher) {
      throw new AppError(404, "Voucher not found");
    }

    if (voucher.event.organizerId !== user.id) {
      throw new AppError(403, "Not authorized to update this voucher");
    }

    // Date transformation if present
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    const updatedVoucher = await prisma.voucher.update({
      where: { id },
      data: updateData,
    });

    successResponse(res, "Voucher updated successfully", updatedVoucher);
  } catch (error) {
    logger.error("Error updating voucher", error);
    next(error);
  }
};

export const deleteVoucher = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!voucher) {
      throw new AppError(404, "Voucher not found");
    }

    if (voucher.event.organizerId !== user.id) {
      throw new AppError(403, "Not authorized to delete this voucher");
    }

    await prisma.voucher.delete({ where: { id } });

    successResponse(res, "Voucher deleted successfully");
  } catch (error) {
    logger.error("Error deleting voucher", error);
    next(error);
  }
};
