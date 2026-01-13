import { Router } from "express";
import { getProfile, getAllUsers } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/profile", authMiddleware, getProfile);

/**
 * @route   GET /api/users
 * @desc    Get all users (protected route example)
 * @access  Public
 */
router.get("/", getAllUsers);

export default router;
