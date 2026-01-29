import { Request, Response, NextFunction } from "express";
import { ValidationError } from "yup";
import { AppError } from "../utils/error";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Yup validation errors
  if (err instanceof ValidationError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.errors,
    });
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaError = err as any;

    if (prismaError.code === "P2002") {
      res.status(409).json({
        success: false,
        message: "A record with this value already exists.",
      });
      return;
    }

    if (prismaError.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Record not found.",
      });
      return;
    }
  }

  // Log error for debugging
  console.error("Error:", err);

  // Default error response
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};
