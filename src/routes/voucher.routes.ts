import { Router } from "express";
import { validateVoucher, updateVoucher, deleteVoucher } from "../controllers/voucher.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { updateVoucherSchema } from "../validations/voucher.validation";

const router = Router();

// Validation can be public or protected. Assuming public for now as users might validate before login or just by code.
// But to prevent brute force, maybe rate limit or auth. 
// Given requirements, generic validation.
router.get("/:code/validate", validateVoucher);

router.put("/:id", authMiddleware, validate(updateVoucherSchema), updateVoucher);
router.delete("/:id", authMiddleware, deleteVoucher);

export default router;
