import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { count } from "console";

// Type definitions for Article operations
interface CreateArticleBody {
  title: string;
  body: string;
  author: string;
  description: string;
}

interface UpdateArticleBody {
  title?: string;
  body?: string;
  author?: string;
  description?: string;
}

interface ArticleResponse {
  id: string;
  title: string;
  body: string;
  author: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @route   GET /api/article
 * @desc    Get all articles
 * @access  Protected
 */
export const getAllArticles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, limit } = req.query;
    const skip = (Number(page) - 1) * Number(limit) || 0;
    const take = Number(limit) || 10;
    const articles = await prisma.article.findMany({
      skip,
      take,
    });

    res.status(200).json({
      success: true,
      message: "Articles retrieved successfully",
      data: {
        articles,
        count: articles.length,
      },
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/article
 * @desc    Create a new article
 * @access  Protected
 */
export const createArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, body, author, description }: CreateArticleBody = req.body;

    // Validate required fields
    if (!title || !body || !author || !description) {
      throw new AppError(
        400,
        "All fields are required: title, body, author, description"
      );
    }

    const article = await prisma.article.create({
      data: {
        title,
        body,
        author,
        description,
      },
    });

    res.status(201).json({
      success: true,
      message: "Article created successfully",
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/article/:id
 * @desc    Update an article by ID
 * @access  Protected
 */
export const updateArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateArticleBody = req.body;

    // Check if article exists
    const existingArticle = await prisma.article.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      throw new AppError(404, "Article not found");
    }

    // Filter out undefined values to allow partial updates
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(filteredData).length === 0) {
      throw new AppError(400, "No valid fields provided for update");
    }

    const updatedArticle = await prisma.article.update({
      where: { id },
      data: filteredData,
    });

    res.status(200).json({
      success: true,
      message: "Article updated successfully",
      data: updatedArticle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/article/:id
 * @desc    Delete an article by ID
 * @access  Protected
 */
export const deleteArticle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if article exists
    const existingArticle = await prisma.article.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      throw new AppError(404, "Article not found");
    }

    await prisma.article.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Article deleted successfully",
      data: existingArticle,
    });
  } catch (error) {
    next(error);
  }
};
