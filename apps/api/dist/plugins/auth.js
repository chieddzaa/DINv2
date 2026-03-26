"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authPlugin = authPlugin;
const supabaseClient_1 = require("../supabaseClient");
async function authPlugin(fastify) {
    fastify.addHook("preHandler", async (request, reply) => {
        const config = request.routeOptions.config;
        const isPublic = config?.public === true;
        if (isPublic)
            return;
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return reply.status(401).send({
                success: false,
                data: null,
                error: "Missing or invalid Authorization header"
            });
        }
        const token = authHeader.slice("Bearer ".length);
        const { data, error } = await supabaseClient_1.supabaseAdmin.auth.getUser(token);
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
        };
    });
}
