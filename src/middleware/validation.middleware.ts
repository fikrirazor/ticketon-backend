import { Request, Response, NextFunction } from "express";
import { AnySchema } from "yup";

export const validate = (schema: AnySchema) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
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
