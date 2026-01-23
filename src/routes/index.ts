import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import articleRoutes from "./article.routes";
import eventRoutes from "./event.routes";
import voucherRoutes from "./voucher.routes";

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
router.use("/article", articleRoutes);
router.use("/events", eventRoutes);
router.use("/vouchers", voucherRoutes);

export default router;
