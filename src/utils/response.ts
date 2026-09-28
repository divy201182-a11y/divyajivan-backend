import { Response } from "express";

export function sendSuccess(
  res: Response,
  data: unknown,
  message = "Success",
  statusCode = 200
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message = "Something went wrong",
  statusCode = 500,
  errorCode?: string
) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errorCode && { errorCode }),
  });
}

export function sendPaginated(
  res: Response,
  data: unknown[],
  total: number,
  page: number,
  limit: number
) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
