import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import transactionRoutes from "./transaction.routes";
import reviewRoutes from "./review.routes";
import eventRoutes from "./event.routes";

const router = Router();

// Health check route
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/events", eventRoutes);
router.use("/transactions", transactionRoutes);
router.use("/reviews", reviewRoutes);

export default router;
