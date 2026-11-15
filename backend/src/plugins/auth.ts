import fp from "fastify-plugin";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";

export const SESSION_COOKIE_NAME = "sv_session";

export default fp(async (fastify) => {
  await fastify.register(cookie, {
    secret: env.COOKIE_SECRET,
  });

  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: SESSION_COOKIE_NAME,
      signed: true,
    },
  });

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify({ onlyCookie: true });
      } catch {
        return reply.status(401).send({
          error: "UNAUTHORIZED",
          message: "Authentication required.",
        });
      }
    }
  );
});