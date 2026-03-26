"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaskRoutes = registerTaskRoutes;
const zod_1 = require("zod");
const supabaseClient_1 = require("../supabaseClient");
const calculateScore_1 = require("../scores/calculateScore");
const createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    scheduled_date: zod_1.z.string(),
    scheduled_time: zod_1.z.string(),
    priority: zod_1.z.enum(["low", "medium", "high"]).default("medium"),
    is_recurring: zod_1.z.boolean().optional(),
    recurrence_rule: zod_1.z.string().optional()
});
const updateTaskSchema = createTaskSchema.partial();
async function registerTaskRoutes(app) {
    app.get("/", async (request, reply) => {
        const userId = request.user.id;
        const date = request.query.date;
        if (!date) {
            return reply.status(400).send({
                success: false,
                data: null,
                error: "Missing date query parameter"
            });
        }
        const { data, error } = await supabaseClient_1.supabaseAdmin
            .from("tasks")
            .select("*")
            .eq("user_id", userId)
            .eq("scheduled_date", date)
            .order("scheduled_time", { ascending: true });
        if (error) {
            return reply.status(500).send({
                success: false,
                data: null,
                error: "Failed to fetch tasks"
            });
        }
        return reply.send({ success: true, data });
    });
    app.post("/", async (request, reply) => {
        const userId = request.user.id;
        const parsed = createTaskSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                success: false,
                data: null,
                error: parsed.error.message
            });
        }
        const { data, error } = await supabaseClient_1.supabaseAdmin
            .from("tasks")
            .insert({ user_id: userId, ...parsed.data })
            .select("*")
            .single();
        if (error) {
            return reply.status(500).send({
                success: false,
                data: null,
                error: "Failed to create task"
            });
        }
        return reply.status(201).send({ success: true, data });
    });
    app.patch("/:id", async (request, reply) => {
        const userId = request.user.id;
        const parsed = updateTaskSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                success: false,
                data: null,
                error: parsed.error.message
            });
        }
        const { data, error } = await supabaseClient_1.supabaseAdmin
            .from("tasks")
            .update(parsed.data)
            .eq("id", request.params.id)
            .eq("user_id", userId)
            .select("*")
            .single();
        if (error) {
            return reply.status(500).send({
                success: false,
                data: null,
                error: "Failed to update task"
            });
        }
        return reply.send({ success: true, data });
    });
    app.delete("/:id", async (request, reply) => {
        const userId = request.user.id;
        const { error } = await supabaseClient_1.supabaseAdmin
            .from("tasks")
            .delete()
            .eq("id", request.params.id)
            .eq("user_id", userId);
        if (error) {
            return reply.status(500).send({
                success: false,
                data: null,
                error: "Failed to delete task"
            });
        }
        return reply.status(204).send();
    });
    app.post("/:id/complete", async (request, reply) => {
        const userId = request.user.id;
        const now = new Date().toISOString();
        const { error } = await supabaseClient_1.supabaseAdmin
            .from("tasks")
            .update({ status: "completed", completed_at: now })
            .eq("id", request.params.id)
            .eq("user_id", userId);
        if (error) {
            return reply.status(500).send({
                success: false,
                data: null,
                error: "Failed to complete task"
            });
        }
        const today = new Date().toISOString().slice(0, 10);
        const score = await (0, calculateScore_1.calculateDINScore)(userId, today);
        return reply.send({ success: true, data: score });
    });
}
