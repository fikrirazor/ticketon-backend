import { Request, Response, NextFunction } from "express";
import { AnySchema } from "yup";

export const validate = (schema: AnySchema, target: "body" | "query" | "params" = "body") => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.validate(req[target], {
        abortEarly: false,
        stripUnknown: true,
      });
      // Optionally cast the validated data back to req[target] if YUP transforms it
      // req[target] = validData;
      next();
    } catch (error) {
      next(error);
    }
  };
};
