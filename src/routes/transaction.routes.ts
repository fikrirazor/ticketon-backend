import { Router } from "express";
import {
  createTransaction,
  getTransactionById,
  getUserTransactions,
  uploadPaymentProof,
  cancelTransaction,
} from "../controllers/transaction.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  createTransactionSchema,
  uploadPaymentProofSchema,
} from "../validations/transaction.validation";
import { upload } from "../middleware/upload.middleware";

const router = Router();

router.get("/me", authMiddleware, getUserTransactions);
router.get("/:id", authMiddleware, getTransactionById);
router.post("/", authMiddleware, validate(createTransactionSchema), createTransaction);
router.post(
  "/:id/payment-proof",
  authMiddleware,
  upload.single("paymentProof"),
  validate(uploadPaymentProofSchema),
  uploadPaymentProof
);
router.put("/:id/cancel", authMiddleware, cancelTransaction);

export default router;
