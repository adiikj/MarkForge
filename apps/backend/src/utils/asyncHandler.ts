import type { Request, Response, NextFunction, RequestHandler } from "express";

const asyncHandler = (
  requestHandler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) => next(error));
  };
};

export { asyncHandler };
