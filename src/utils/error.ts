export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: "failure" | "error";
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "failure" : "error";
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}