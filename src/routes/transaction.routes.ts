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
  validate(submitPaymentProofSchema),
  uploadPaymentProof,
);
router.put("/:id/cancel", authMiddleware, cancelTransaction);

export default router;
