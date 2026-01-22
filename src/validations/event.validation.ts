import * as yup from "yup";

export const createEventSchema = yup.object().shape({
  title: yup.string().required("Title is required").min(3, "Title must be at least 3 characters"),
  description: yup.string().required("Description is required").min(10, "Description must be at least 10 characters"),
  location: yup.string().required("Location is required"),
  startDate: yup.date().required("Start date is required").typeError("Start date must be a valid date"),
  endDate: yup
    .date()
    .required("End date is required")
    .typeError("End date must be a valid date")
    .min(yup.ref("startDate"), "End date must be after start date"),
  price: yup
    .number()
    .required("Price is required")
    .min(0, "Price cannot be negative")
    .typeError("Price must be a number"),
  seatTotal: yup
    .number()
    .required("Total seats is required")
    .min(1, "Total seats must be at least 1")
    .integer("Total seats must be an integer"),
  category: yup.string().required("Category is required"),
  imageUrl: yup.string().url("Image URL must be a valid URL").nullable(),
  isPromoted: yup.boolean().default(false),
});

export const updateEventSchema = yup.object().shape({
  title: yup.string().min(3),
  description: yup.string().min(10),
  location: yup.string(),
  startDate: yup.date(),
  endDate: yup.date().min(yup.ref("startDate"), "End date must be after start date"),
  price: yup.number().min(0),
  seatTotal: yup.number().min(1).integer(),
  seatLeft: yup.number().min(0).integer(),
  category: yup.string(),
  imageUrl: yup.string().url().nullable(),
  isPromoted: yup.boolean(),
});

export const queryEventSchema = yup.object().shape({
  category: yup.string(),
  location: yup.string(),
  search: yup.string(),
  page: yup.number().min(1).default(1),
  limit: yup.number().min(1).default(10),
});
