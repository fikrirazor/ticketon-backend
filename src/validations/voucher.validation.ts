import * as yup from "yup";

export const createVoucherSchema = yup
  .object({
    code: yup
      .string()
      .required("Code is required")
      .min(3, "Code must be at least 3 characters")
      .uppercase(),
    discountAmount: yup.number().nullable().optional().min(0, "Discount amount must be positive"),
    discountPercent: yup
      .number()
      .nullable()
      .optional()
      .min(1, "Discount percent must be at least 1%")
      .max(100, "Discount percent cannot exceed 100%"),
    maxUsage: yup.number().default(100).min(1, "Max usage must be at least 1"),
    startDate: yup.date().required("Start date is required"),
    endDate: yup
      .date()
      .required("End date is required")
      .min(yup.ref("startDate"), "End date must be after start date"),
  })
  .test(
    "at-least-one-discount",
    "Either discountAmount or discountPercent is required",
    function (value) {
      // Check if at least one of them is defined and non-null (if nullable)
      const hasAmount = value.discountAmount !== undefined && value.discountAmount !== null;
      const hasPercent = value.discountPercent !== undefined && value.discountPercent !== null;
      return hasAmount || hasPercent;
    },
  );

export const updateVoucherSchema = yup.object({
  code: yup.string().optional().min(3).uppercase(),
  discountAmount: yup.number().nullable().optional().min(0),
  discountPercent: yup.number().nullable().optional().min(1).max(100),
  maxUsage: yup.number().optional().min(1),
  startDate: yup.date().optional(),
  endDate: yup.date().optional(),
});
