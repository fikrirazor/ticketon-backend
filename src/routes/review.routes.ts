import { Router } from "express";
import { createReview } from "../controllers/review.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { createReviewSchema } from "../validations/review.validation";

const router = Router();

router.post(
  "/",
  authMiddleware,
  validateRequest(createReviewSchema),
  createReview
);

export default router;
