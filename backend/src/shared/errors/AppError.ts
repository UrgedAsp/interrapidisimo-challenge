export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown[] = []
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(code: string, message: string, details: unknown[] = []) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = 'No autorizado') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Prohibido') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(resource: string) {
    return new AppError(404, 'NOT_FOUND', `${resource} no encontrado`);
  }

  static conflict(code: string, message: string) {
    return new AppError(409, code, message);
  }

  static unprocessable(code: string, message: string, details: unknown[] = []) {
    return new AppError(422, code, message, details);
  }

  static internal(message = 'Error interno del servidor') {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}
