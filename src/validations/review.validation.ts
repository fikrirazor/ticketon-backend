import * as yup from "yup";

export const createReviewSchema = yup.object().shape({
  rating: yup
    .number()
    .required("Rating is required")
    .integer("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  comment: yup.string().nullable(),
});

export const updateReviewSchema = yup.object().shape({
  rating: yup
    .number()
    .integer("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  comment: yup.string().nullable(),
});

export const queryReviewSchema = yup.object().shape({
  page: yup.number().min(1).default(1),
  limit: yup.number().min(1).default(10),
  sortBy: yup.string().oneOf(["newest", "highest", "lowest"]).default("newest"),
});
