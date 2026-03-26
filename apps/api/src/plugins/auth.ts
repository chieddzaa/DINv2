import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { supabaseAdmin } from "../supabaseClient";
import { AuthUser } from "../types";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

export async function authPlugin(fastify: FastifyInstance) {
  fastify.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    const config = request.routeOptions.config as any;
    const isPublic = config?.public === true;
    if (isPublic) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({
        success: false,
        data: null,
        error: "Missing or invalid Authorization header"
      });
    }

    const token = authHeader.slice("Bearer ".length);
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return reply.status(401).send({
        success: false,
        data: null,
        error: "Invalid token"
      });
    }

    request.user = {
      id: data.user.id,
      email: data.user.email ?? undefined
    } as AuthUser;
  });
}
