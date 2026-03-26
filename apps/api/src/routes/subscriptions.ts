import { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabaseAdmin } from "../supabaseClient";
import { APIResponse, AuthUser } from "../types";

const webhookBodySchema = z.object({
  user_id: z.string().uuid().optional(),
  din_tier: z.enum(["free", "pro"]).optional(),
  source: z.enum(["stripe", "revenuecat"]).optional()
});

export async function registerSubscriptionRoutes(app: FastifyInstance) {
  app.post(
    "/webhook",
    { config: { public: true } },
    async (request, reply) => {
      const parsed = webhookBodySchema.safeParse(request.body);
      if (!parsed.success || !parsed.data.user_id || !parsed.data.din_tier) {
        return reply.status(400).send(<APIResponse<null>>{
          success: false,
          data: null,
          error: "Invalid webhook payload"
        });
      }

      const { error } = await supabaseAdmin
        .from("users")
        .update({ din_tier: parsed.data.din_tier })
        .eq("id", parsed.data.user_id);

      if (error) {
        return reply.status(500).send(<APIResponse<null>>{
          success: false,
          data: null,
          error: "Failed to update subscription tier"
        });
      }

      return reply.send(<APIResponse<{ user_id: string; din_tier: string }>>{
        success: true,
        data: {
          user_id: parsed.data.user_id,
          din_tier: parsed.data.din_tier
        }
      });
    }
  );

  app.get("/status", async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("din_tier")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return reply.status(500).send(<APIResponse<null>>{
        success: false,
        data: null,
        error: "Failed to fetch subscription status"
      });
    }

    return reply.send(<APIResponse<{ tier: string }>>{
      success: true,
      data: { tier: data?.din_tier ?? "free" }
    });
  });
}
