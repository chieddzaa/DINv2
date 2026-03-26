"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNotificationRoutes = registerNotificationRoutes;
const zod_1 = require("zod");
const supabaseClient_1 = require("../supabaseClient");
const registerTokenSchema = zod_1.z.object({
    expo_push_token: zod_1.z.string().min(1)
});
async function registerNotificationRoutes(app) {
    app.post("/register-token", async (request, reply) => {
        const userId = request.user.id;
        const parsed = registerTokenSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                success: false,
                data: null,
                error: parsed.error.message
            });
        }
        const { error } = await supabaseClient_1.supabaseAdmin
            .from("users")
            .update({ expo_push_token: parsed.data.expo_push_token })
            .eq("id", userId);
        if (error) {
            return reply.status(500).send({
                success: false,
                data: null,
                error: "Failed to save push token"
            });
        }
        return reply.send({
            success: true,
            data: { expo_push_token: parsed.data.expo_push_token }
        });
    });
}
