import { Router } from "express";
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/event.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  createEventSchema,
  updateEventSchema,
  queryEventSchema,
} from "../validations/event.validation";
import { createVoucher, getVouchersByEvent } from "../controllers/voucher.controller";
import { createVoucherSchema } from "../validations/voucher.validation";
import { upload } from "../middleware/upload.middleware";

const router = Router();

router.get("/", validate(queryEventSchema, "query"), getEvents);
router.get("/:id", getEventById);

router.post(
  "/",
  authMiddleware,
  (req, _res, next) => {
    (req as any).uploadDir = "events";
    next();
  },
  upload.single("image"),
  validate(createEventSchema),
  createEvent,
);
router.put("/:id", authMiddleware, validate(updateEventSchema), updateEvent);
router.delete("/:id", authMiddleware, deleteEvent);

router.post("/:eventId/vouchers", authMiddleware, validate(createVoucherSchema), createVoucher);
router.get("/:eventId/vouchers", authMiddleware, getVouchersByEvent);

export default router;
