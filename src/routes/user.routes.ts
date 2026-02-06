import { Router } from "express";
import { getProfile, getAllUsers, updateProfile } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/profile", authMiddleware, getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put(
  "/profile",
  authMiddleware,
  (req, _res, next) => {
    (req as any).uploadDir = "avatars";
    next();
  },
  upload.single("avatar"),
  updateProfile,
);

/**
 * @route   GET /api/users
 * @desc    Get all users (protected route example)
 * @access  Public
 */
router.get("/", getAllUsers);

export default router;
