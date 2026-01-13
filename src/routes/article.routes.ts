import { Router } from "express";
import {
  getAllArticles,
  createArticle,
  updateArticle,
  deleteArticle,
} from "../controllers/article.controller";
// import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
// router.use(authMiddleware);

/**
 * @route   GET /api/article
 * @desc    Get all articles
 * @access  Protected
 */
router.get("/", getAllArticles);

/**
 * @route   POST /api/article
 * @desc    Create a new article
 * @access  Protected
 */
router.post("/", createArticle);

/**
 * @route   PATCH /api/article/:id
 * @desc    Update an article by ID
 * @access  Protected
 */
router.patch("/:id", updateArticle);

/**
 * @route   DELETE /api/article/:id
 * @desc    Delete an article by ID
 * @access  Protected
 */
router.delete("/:id", deleteArticle);

export default router;
