import { Request, Response, NextFunction } from "express";
import * as yup from "yup";

export const validateRequest = (schema: yup.Schema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
};
