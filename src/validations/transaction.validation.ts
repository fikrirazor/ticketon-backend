import * as yup from "yup";

export const createTransactionSchema = yup.object({
  body: yup.object({
    eventId: yup.string().uuid().required("Event ID is required"),
    voucherId: yup.string().uuid().optional(),
    pointsUsed: yup.number().integer().min(0).default(0),
    items: yup.array().of(
      yup.object({
        quantity: yup.number().integer().min(1).required("Quantity is required"),
      })
    ).min(1, "At least one item is required").required(),
  }),
});

export const uploadPaymentProofSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid().required("Transaction ID is required"),
  }),
});
