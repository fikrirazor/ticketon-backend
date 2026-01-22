export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
}

export const sendResponse = <T>(
  res: any, // Using any to avoid circular dependency or import issues with Express Response if strictly typed here, but ideally should be Response
  statusCode: number,
  success: boolean,
  message: string,
  data?: T,
  pagination?: PaginationMeta
) => {
  const response: ApiResponse<T> = {
    success,
    message,
    data,
    pagination,
  };
  res.status(statusCode).json(response);
};

export const successResponse = <T>(
  res: any,
  message: string,
  data?: T,
  pagination?: PaginationMeta
) => {
  sendResponse(res, 200, true, message, data, pagination);
};

export const errorResponse = (
  res: any,
  statusCode: number,
  message: string,
  data?: any
) => {
  sendResponse(res, statusCode, false, message, data);
};
