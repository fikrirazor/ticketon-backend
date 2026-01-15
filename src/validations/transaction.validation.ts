import * as yup from "yup";

export const createTransactionSchema = yup.object({
  eventId: yup.string().required("Event ID is required"),
  ticketQty: yup
    .number()
    .required("Ticket quantity is required")
    .min(1, "Ticket quantity must be at least 1"),
  usePoints: yup.boolean().default(false),
  voucherCode: yup.string().optional(),
});
