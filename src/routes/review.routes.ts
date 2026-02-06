import { Router } from "express";
import {
  createReview,
  getEventReviews,
  getOrganizerReviews,
  getEligibleReviews,
  updateReview,
  deleteReview,
} from "../controllers/review.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  createReviewSchema,
  updateReviewSchema,
  queryReviewSchema,
} from "../validations/review.validation";

const router = Router();

// Public/Semi-public routes (some might need auth depending on requirements,
// but GET reviews is usually public)
router.get("/events/:eventId", validate(queryReviewSchema), getEventReviews);
router.get("/organizers/:organizerId", validate(queryReviewSchema), getOrganizerReviews);

// Protected routes
router.post("/events/:eventId", authMiddleware, validate(createReviewSchema), createReview);
router.get("/me/eligible", authMiddleware, getEligibleReviews);
router.put("/:id", authMiddleware, validate(updateReviewSchema), updateReview);
router.delete("/:id", authMiddleware, deleteReview);

export default router;
