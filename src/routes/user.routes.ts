import { Router } from "express";
import { getProfile, getAllUsers, updateProfile, updatePassword } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { updateProfileSchema, changePasswordSchema } from "../validations/user.validation";

const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/profile", authMiddleware, getProfile);

router.patch(
  "/profile",
  authMiddleware,
  validateRequest(updateProfileSchema),
  updateProfile
);

router.patch(
  "/password",
  authMiddleware,
  validateRequest(changePasswordSchema),
  updatePassword
);

/**
 * @route   GET /api/users
 * @desc    Get all users (protected route example)
 * @access  Public
 */
router.get("/", getAllUsers);

export default router;
