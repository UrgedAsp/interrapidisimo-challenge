import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors.js';
import type { ApiErrorBody, ErrorCode, ErrorDetail } from './types.js';
import { validationDetails } from './validate.js';

/**
 * Último middleware de la cadena. Es el único lugar donde se decide la forma de
 * una respuesta de error, y por lo tanto el único que puede filtrar una traza.
 */

type BodyParserError = { type?: unknown; status?: unknown };

function isBodyParserError(error: unknown): error is BodyParserError {
  return typeof error === 'object' && error !== null && 'type' in error;
}

const BODY_PARSER_MESSAGES: Record<string, { status: number; message: string }> = {
  'entity.parse.failed': {
    status: 400,
    message: 'El cuerpo de la petición no es JSON válido',
  },
  'entity.too.large': {
    status: 413,
    message: 'El cuerpo de la petición es demasiado grande',
  },
};

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'El endpoint solicitado no existe'));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  // Si ya se escribieron cabeceras no se puede cambiar el status; se delega
  // para que Express destruya la conexión en vez de emitir un JSON truncado.
  if (res.headersSent) {
    next(error);
    return;
  }

  let status = 500;
  let code: ErrorCode = 'INTERNAL_ERROR';
  let message = 'Ocurrió un error inesperado. Intenta de nuevo.';
  let details: ErrorDetail[] | undefined;

  if (error instanceof AppError) {
    status = error.status;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = 'Datos inválidos';
    details = validationDetails(error);
  } else if (isBodyParserError(error) && typeof error.type === 'string') {
    const mapped = BODY_PARSER_MESSAGES[error.type];
    status = mapped?.status ?? 500;
    code = mapped ? 'BAD_REQUEST' : 'INTERNAL_ERROR';
    message = mapped?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.';
  } else {
    // Único punto donde se registra el error real. El cliente nunca lo ve.
    console.error('[error] fallo no controlado:', error);
  }

  const body: ApiErrorBody = { error: { code, message, ...(details ? { details } : {}) } };

  res.status(status).json(body);
};
