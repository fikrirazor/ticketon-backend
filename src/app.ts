import express, { Application } from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const app: Application = express();

app.use(compression());

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Serve static files (e.g. payment proofs, event images)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API routes
app.use("/api", routes);

// Root route
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the API",
    version: "1.0.0",
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
