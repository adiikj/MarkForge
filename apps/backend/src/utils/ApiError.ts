class ApiError extends Error {
  statusCode: number;
  data: null;
  success: false;
  errors: unknown[];

  constructor(
    statusCode: number,
    message = "Internal Server Error",
    errors: unknown[] = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
