import * as yup from "yup";

export const createReviewSchema = yup.object({
  eventId: yup.string().required("Event ID is required"),
  rating: yup
    .number()
    .required("Rating is required")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  comment: yup
    .string()
    .required("Comment is required")
    .min(10, "Comment must be at least 10 characters"),
});
