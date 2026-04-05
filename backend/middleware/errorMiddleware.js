export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)[0].message;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'Field';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Malformed JSON body — Case 3
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON — check your request body';
  }

  // Missing or undefined body — Case 4
  if (err.name === 'TypeError' && err.message.includes('Cannot destructure')) {
    statusCode = 400;
    message = 'Request body is missing or not valid JSON';
  }

  // JWT invalid token
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Not authorised — invalid token';
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Not authorised — token has expired';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};