import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { TransactionStatus } from "@prisma/client";

export const createReview = async (
  userId: string,
  data: {
    eventId: string;
    rating: number;
    comment: string;
  }
) => {
  // Check if user attended event (Transaction DONE)
  const transaction = await prisma.transaction.findFirst({
    where: {
      userId,
      eventId: data.eventId,
      status: TransactionStatus.DONE,
    },
  });

  if (!transaction) {
    throw new AppError(
      400,
      "You can only review events you have attended (Transaction status must be DONE)"
    );
  }

  // Check if already reviewed
  const existingReview = await prisma.review.findFirst({
    where: {
      userId,
      eventId: data.eventId,
    },
  });

  if (existingReview) {
    throw new AppError(400, "You have already reviewed this event");
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      userId,
      eventId: data.eventId,
      rating: data.rating,
      comment: data.comment,
    },
  });

  return review;
};
