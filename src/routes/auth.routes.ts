import { Router } from "express";
import { signUp, signIn, forgotPassword, resetPassword } from "../controllers/auth.controller";
import { validate } from "../middleware/validation.middleware";
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validations/auth.validation";

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post("/signup", validate(signUpSchema), signUp);

/**
 * @route   POST /api/auth/signin
 * @desc    Sign in a user
 * @access  Public
 */
router.post("/signin", validate(signInSchema), signIn);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset token
 * @access  Public
 */
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
