import fp from "fastify-plugin";
import { ZodError } from "zod";

export default fp(async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request payload.",
        details: error.flatten().fieldErrors,
      });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: "RATE_LIMITED",
        message: "Too many requests. Please slow down.",
      });
    }

    request.log.error(error);
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? "INTERNAL_ERROR" : error.code ?? "REQUEST_ERROR",
      message: statusCode >= 500 ? "An unexpected server error occurred." : error.message,
    });
  });
});