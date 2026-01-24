import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { successResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";

/**
 * Helper to update Event and Organizer average ratings
 */
const updateRatings = async (tx: any, eventId: string) => {
  const event = await tx.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });

  if (!event) return;

  const organizerId = event.organizerId;

  // 1. Calculate and update Event average rating
  const eventRating = await tx.review.aggregate({
    where: { eventId },
    _avg: { rating: true },
  });

  await tx.event.update({
    where: { id: eventId },
    data: { rating: eventRating._avg.rating || 0 },
  });

  // 2. Calculate and update Organizer average rating summary
  const organizerRating = await tx.review.aggregate({
    where: { event: { organizerId } },
    _avg: { rating: true },
  });

  await tx.user.update({
    where: { id: organizerId },
    data: { ratingSummary: organizerRating._avg.rating || 0 },
  });
};

export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { rating, comment } = req.body;
    const userId = (req as any).user.id;

    // 1. Check if event exists and has ended
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError(404, "Event not found");
    }

    if (new Date() < event.endDate) {
      throw new AppError(400, "You can only review an event after it has ended");
    }

    // 2. Check if user attended the event (transaction DONE)
    const transaction = await prisma.transaction.findFirst({
      where: {
        userId,
        eventId,
        status: "DONE",
      },
    });

    if (!transaction) {
      throw new AppError(403, "You can only review events you have attended");
    }

    // 3. Check if user already reviewed
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (existingReview) {
      throw new AppError(400, "You have already reviewed this event");
    }

    // 4. Create review and update ratings in transaction
    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          userId,
          eventId,
          rating,
          comment,
        },
      });

      await updateRatings(tx, eventId);
      return newReview;
    });

    successResponse(res, "Review created successfully", review);
  } catch (error) {
    logger.error("Error creating review", error);
    next(error);
  }
};

export const getEventReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || "newest";
    const skip = (page - 1) * limit;

    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "highest") orderBy = { rating: "desc" };
    if (sortBy === "lowest") orderBy = { rating: "asc" };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { eventId },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.review.count({ where: { eventId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    successResponse(res, "Reviews retrieved successfully", reviews, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    logger.error("Error retrieving event reviews", error);
    next(error);
  }
};

export const getOrganizerReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { organizerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [reviews, total, organizer] = await Promise.all([
      prisma.review.findMany({
        where: { event: { organizerId } },
        include: {
          user: { select: { id: true, name: true } },
          event: { select: { id: true, title: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.count({ where: { event: { organizerId } } }),
      prisma.user.findUnique({
        where: { id: organizerId },
        select: { ratingSummary: true },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    successResponse(res, "Organizer reviews retrieved successfully", reviews, {
      page,
      limit,
      total,
      totalPages,
      averageRating: organizer?.ratingSummary || 0,
    });
  } catch (error) {
    logger.error("Error retrieving organizer reviews", error);
    next(error);
  }
};

export const getEligibleReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    // Events user attended (DONE) that have ended and NOT yet reviewed
    const eligibleEvents = await prisma.event.findMany({
      where: {
        endDate: { lt: new Date() },
        transactions: {
          some: {
            userId,
            status: "DONE",
          },
        },
        reviews: {
          none: {
            userId,
          },
        },
      },
      orderBy: { endDate: "desc" },
    });

    successResponse(res, "Eligible reviews retrieved successfully", eligibleEvents);
  } catch (error) {
    logger.error("Error retrieving eligible reviews", error);
    next(error);
  }
};

export const updateReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = (req as any).user.id;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new AppError(404, "Review not found");
    }

    if (review.userId !== userId) {
      throw new AppError(403, "Not authorized to update this review");
    }

    // Check if within 24 hours
    const now = new Date();
    const reviewCreatedAt = new Date(review.createdAt);
    const diffHours = (now.getTime() - reviewCreatedAt.getTime()) / (1000 * 60 * 60);

    if (diffHours > 24) {
      throw new AppError(400, "Review can only be updated within 24 hours of creation");
    }

    const updatedReview = await prisma.$transaction(async (tx) => {
      const ur = await tx.review.update({
        where: { id },
        data: { rating, comment },
      });

      await updateRatings(tx, review.eventId);
      return ur;
    });

    successResponse(res, "Review updated successfully", updatedReview);
  } catch (error) {
    logger.error("Error updating review", error);
    next(error);
  }
};

export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new AppError(404, "Review not found");
    }

    if (review.userId !== userId && (req as any).user.role !== "ORGANIZER") {
        // Need to check if user is the admin or the organizer? Usually only user or admin.
        // The prompt says "delete review", I'll allow user to delete their own.
        throw new AppError(403, "Not authorized to delete this review");
    }

    await prisma.$transaction(async (tx) => {
      await tx.review.delete({
        where: { id },
      });

      await updateRatings(tx, review.eventId);
    });

    successResponse(res, "Review deleted successfully");
  } catch (error) {
    logger.error("Error deleting review", error);
    next(error);
  }
};
