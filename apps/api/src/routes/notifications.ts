import { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabaseAdmin } from "../supabaseClient";
import { APIResponse, AuthUser } from "../types";

const registerTokenSchema = z.object({
  expo_push_token: z.string().min(1)
});

export async function registerNotificationRoutes(app: FastifyInstance) {
  app.post("/register-token", async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const parsed = registerTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(<APIResponse<null>>{
        success: false,
        data: null,
        error: parsed.error.message
      });
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update({ expo_push_token: parsed.data.expo_push_token })
      .eq("id", userId);

    if (error) {
      return reply.status(500).send(<APIResponse<null>>{
        success: false,
        data: null,
        error: "Failed to save push token"
      });
    }

    return reply.send(<APIResponse<{ expo_push_token: string }>>{
      success: true,
      data: { expo_push_token: parsed.data.expo_push_token }
    });
  });
}
