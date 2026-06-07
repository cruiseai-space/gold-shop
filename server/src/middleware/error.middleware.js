import { ApiError } from '../utils/ApiError.js';

export const errorHandler = (err, req, res, next) => {
  let { statusCode, code, message, field } = err;

  if (!(err instanceof ApiError)) {
    statusCode = 500;
    code = 'INTERNAL_SERVER_ERROR';
    message = process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      field,
      statusCode
    }
  });
};
