import { Router } from "express";
import { signUp, signIn } from "../controllers/auth.controller";
import { validate } from "../middleware/validation.middleware";
import { signUpSchema, signInSchema } from "../validations/auth.validation";

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

export default router;
