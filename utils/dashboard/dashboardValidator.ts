import Joi from "joi";
import { NextFunction, Request, Response } from "express";

const metricsQuerySchema = Joi.object({
  preset: Joi.string().valid("1h", "24h", "7d", "30d").optional(),
  from: Joi.string().isoDate().optional(),
  to: Joi.string().isoDate().optional(),
}).and("from", "to").or("preset", "from");

const dashboardValidatorV1 = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { error } = metricsQuerySchema.validate(req.query, {
    abortEarly: false,
    allowUnknown: false,
  });
  if (error) {
    res.status(400).json({
      error: "Invalid query params",
      details: error.details.map((d) => d.message),
    });
    return;
  }
  next();
};

export { dashboardValidatorV1 };
