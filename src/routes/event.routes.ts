import { Router } from "express";
import { createEvent, getEvents, getEventById } from "../controllers/event.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { createEventSchema } from "../validations/event.validation";

const router = Router();

router.get("/", getEvents);
router.get("/:id", getEventById);

router.post(
  "/",
  authMiddleware,
  validateRequest(createEventSchema),
  createEvent
);

export default router;
