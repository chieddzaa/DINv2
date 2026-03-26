"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSubscriptionRoutes = registerSubscriptionRoutes;
const zod_1 = require("zod");
const supabaseClient_1 = require("../supabaseClient");
const webhookBodySchema = zod_1.z.object({
    user_id: zod_1.z.string().uuid().optional(),
    din_tier: zod_1.z.enum(["free", "pro"]).optional(),
    source: zod_1.z.enum(["stripe", "revenuecat"]).optional()
});
async function registerSubscriptionRoutes(app) {
    app.post("/webhook", { config: { public: true } }, async (request, reply) => {
        const parsed = webhookBodySchema.safeParse(request.body);
        if (!parsed.success || !parsed.data.user_id || !parsed.data.din_tier) {
            return reply.status(400).send({
                success: false,
                data: null,
                error: "Invalid webhook payload"
            });
        }
        const { error } = await supabaseClient_1.supabaseAdmin
            .from("users")
            .update({ din_tier: parsed.data.din_tier })
            .eq("id", parsed.data.user_id);
        if (error) {
            return reply.status(500).send({
                success: false,
                data: null,
                error: "Failed to update subscription tier"
            });
        }
        return reply.send({
            success: true,
            data: {
                user_id: parsed.data.user_id,
                din_tier: parsed.data.din_tier
            }
        });
    });
    app.get("/status", async (request, reply) => {
        const userId = request.user.id;
        const { data, error } = await supabaseClient_1.supabaseAdmin
            .from("users")
            .select("din_tier")
            .eq("id", userId)
            .maybeSingle();
        if (error) {
            return reply.status(500).send({
                success: false,
                data: null,
                error: "Failed to fetch subscription status"
            });
        }
        return reply.send({
            success: true,
            data: { tier: data?.din_tier ?? "free" }
        });
    });
}
