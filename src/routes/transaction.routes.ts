import { Router } from "express";
import {
  createTransaction,
  getTransactionById,
  getUserTransactions,
  uploadPaymentProof,
  cancelTransaction,
  approveTransaction,
  rejectTransaction,
} from "../controllers/transaction.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  createTransactionSchema,
  uploadPaymentProofSchema,
  submitPaymentProofSchema,
} from "../validations/transaction.validation";

const router = Router();

router.get("/me", authMiddleware, getUserTransactions);
router.get("/:id", authMiddleware, getTransactionById);
router.post("/", authMiddleware, validate(createTransactionSchema), createTransaction);
router.post(
  "/:id/payment-proof",
  authMiddleware,
  validate(uploadPaymentProofSchema, "params"),
  (req, _res, next) => {
    (req as any).uploadDir = "payments";
    next();
  },
  upload.single("paymentProof"),
  validate(submitPaymentProofSchema),
  uploadPaymentProof,
);
router.put("/:id/cancel", authMiddleware, cancelTransaction);

// Organizer actions
router.patch("/:id/approve", authMiddleware, approveTransaction);
router.patch("/:id/reject", authMiddleware, rejectTransaction);

export default router;
