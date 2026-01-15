import { Router } from "express";
import { createTransaction, getMyTransactions, uploadProof } from "../controllers/transaction.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validation.middleware";
import { createTransactionSchema } from "../validations/transaction.validation";
import multer from "multer";
import path from "path";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads"); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ dest: 'uploads/' }); 

router.post(
  "/",
  authMiddleware,
  validateRequest(createTransactionSchema),
  createTransaction
);

router.get("/", authMiddleware, getMyTransactions);

router.patch(
  "/:id/proof",
  authMiddleware,
  upload.single("proofImage"),
  uploadProof
);

export default router;
