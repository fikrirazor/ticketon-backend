import { Request, Response, NextFunction } from "express";
import { ValidationError } from "yup";
import { AppError } from "../utils/error";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Yup validation errors
  if (err instanceof ValidationError) {
    // Log validation error dengan format yang jelas
    console.error("\n🔴 VALIDATION ERROR:");
    console.error("Path:", req.method, req.originalUrl);
    console.error("Errors:", err.errors);
    console.error("─────────────────────────────────────\n");
    
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.errors,
    });
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    // Log AppError dengan warna dan format yang jelas
    const isClientError = err.statusCode < 500;
    const emoji = isClientError ? "⚠️" : "🔴";
    
    console.error(`\n${emoji} APP ERROR [${err.statusCode}]:`);
    console.error("Path:", req.method, req.originalUrl);
    console.error("Message:", err.message);
    console.error("Status:", err.status);
    
    // Tampilkan stack trace di development
    if (process.env.NODE_ENV === "development" && err.stack) {
      console.error("Stack:", err.stack);
    }
    console.error("─────────────────────────────────────\n");
    
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaError = err as any;
    
    console.error("\n🔴 PRISMA ERROR:");
    console.error("Path:", req.method, req.originalUrl);
    console.error("Code:", prismaError.code);
    console.error("Meta:", prismaError.meta);
    console.error("─────────────────────────────────────\n");

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

  // Log unexpected errors dengan format yang sangat jelas
  console.error("\n🚨 UNEXPECTED ERROR:");
  console.error("Path:", req.method, req.originalUrl);
  console.error("Name:", err.name);
  console.error("Message:", err.message);
  
  // Tampilkan full stack trace di development
  if (process.env.NODE_ENV === "development" && err.stack) {
    console.error("Stack Trace:");
    console.error(err.stack);
  }
  console.error("─────────────────────────────────────\n");

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
