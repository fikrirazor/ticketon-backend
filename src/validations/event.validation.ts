import * as yup from "yup";

export const createEventSchema = yup.object({
  title: yup.string().required(),
  description: yup.string().required(),
  location: yup.string().required(),
  image: yup.string(),
  startDate: yup.date().required(),
  endDate: yup.date().required().min(yup.ref('startDate')),
  price: yup.number().required().min(0),
  seatTotal: yup.number().required().min(1),
  type: yup.mixed().oneOf(['FREE', 'PAID']).required(),
});
