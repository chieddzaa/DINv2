import { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabaseAdmin } from "../supabaseClient";
import { APIResponse, AuthUser } from "../types";
import { calculateDINScore } from "../scores/calculateScore";

const createTaskSchema = z.object({
  title: z.string().min(1),
  scheduled_date: z.string(),
  scheduled_time: z.string(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  is_recurring: z.boolean().optional(),
  recurrence_rule: z.string().optional()
});

const updateTaskSchema = createTaskSchema.partial();

export async function registerTaskRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { date?: string } }>("/", async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const date = request.query.date;
    if (!date) {
      return reply.status(400).send(<APIResponse<null>>{
        success: false,
        data: null,
        error: "Missing date query parameter"
      });
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("scheduled_date", date)
      .order("scheduled_time", { ascending: true });

    if (error) {
      return reply.status(500).send(<APIResponse<null>>{
        success: false,
        data: null,
        error: "Failed to fetch tasks"
      });
    }

    return reply.send(<APIResponse<typeof data>>{ success: true, data });
  });

  app.post("/", async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const parsed = createTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(<APIResponse<null>>{
        success: false,
        data: null,
        error: parsed.error.message
      });
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .insert({ user_id: userId, ...parsed.data })
      .select("*")
      .single();

    if (error) {
      return reply.status(500).send(<APIResponse<null>>{
        success: false,
        data: null,
        error: "Failed to create task"
      });
    }

    return reply.status(201).send(<APIResponse<typeof data>>{ success: true, data });
  });

  app.patch<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const parsed = updateTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(<APIResponse<null>>{
        success: false,
        data: null,
        error: parsed.error.message
      });
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .update(parsed.data)
      .eq("id", request.params.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      return reply.status(500).send(<APIResponse<null>>{
        success: false,
        data: null,
        error: "Failed to update task"
      });
    }

    return reply.send(<APIResponse<typeof data>>{ success: true, data });
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const { error } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("id", request.params.id)
      .eq("user_id", userId);

    if (error) {
      return reply.status(500).send(<APIResponse<null>>{
        success: false,
        data: null,
        error: "Failed to delete task"
      });
    }

    return reply.status(204).send();
  });

  app.post<{ Params: { id: string } }>("/:id/complete", async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("tasks")
      .update({ status: "completed", completed_at: now })
      .eq("id", request.params.id)
      .eq("user_id", userId);

    if (error) {
      return reply.status(500).send(<APIResponse<null>>{
        success: false,
        data: null,
        error: "Failed to complete task"
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const score = await calculateDINScore(userId, today);
    return reply.send(<APIResponse<typeof score>>{ success: true, data: score });
  });
}
