import * as yup from "yup";

export const createTransactionSchema = yup.object().shape({
  eventId: yup.string().uuid().required("Event ID is required"),
  voucherId: yup.string().uuid().optional().nullable(),
  pointsUsed: yup.number().integer().min(0).default(0),
  items: yup.array().of(
    yup.object().shape({
      quantity: yup.number().integer().min(1).required("Quantity is required"),
    })
  ).min(1, "At least one item is required").required(),
});

export const uploadPaymentProofSchema = yup.object().shape({
  id: yup.string().uuid().required("Transaction ID is required"),
});

export const submitPaymentProofSchema = yup.object().shape({
  paymentProofUrl: yup.string().url("Payment proof must be a valid URL").required("Payment proof URL is required"),
});
