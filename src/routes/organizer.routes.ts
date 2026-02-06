import { Router } from "express";
import {
  getDashboardStats,
  getOrganizerEvents,
  getOrganizerTransactions,
} from "../controllers/organizer.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// All organizer routes require authentication
router.use(authMiddleware);

// Middleware to ensure user is an organizer
router.use((req, res, next) => {
  if ((req as any).user.role !== "ORGANIZER") {
    res.status(403).json({
      success: false,
      message: "Access denied. Only organizers can access this area.",
    });
    return;
  }
  next();
});

router.get("/stats", getDashboardStats);
router.get("/events", getOrganizerEvents);
router.get("/transactions", getOrganizerTransactions);

export default router;
