import { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../supabaseClient";
import { APIResponse, AuthUser } from "../types";
import { getDINTier } from "../scores/calculateScore";
import { getToneMessage } from "../notifications/toneEngine";

export async function registerScoreRoutes(app: FastifyInstance) {
  app.get("/dashboard", async (request, reply) => {
    const userId = (request.user as AuthUser).id;
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const from7 = new Date(today);
    from7.setDate(from7.getDate() - 6);
    const from14 = new Date(today);
    from14.setDate(from14.getDate() - 13);

    const { data: todayScore } = await supabaseAdmin
      .from("din_scores")
      .select("completion_pct, streak_day")
      .eq("user_id", userId)
      .eq("date", todayStr)
      .maybeSingle();

    const { data: last7 } = await supabaseAdmin
      .from("din_scores")
      .select("date, completion_pct")
      .eq("user_id", userId)
      .gte("date", from7.toISOString().slice(0, 10))
      .lte("date", todayStr)
      .order("date", { ascending: true });

    const { data: last14 } = await supabaseAdmin
      .from("din_scores")
      .select("completion_pct")
      .eq("user_id", userId)
      .gte("date", from14.toISOString().slice(0, 10))
      .lte("date", todayStr);

    const today_pct = todayScore?.completion_pct ?? 0;
    const streak = todayScore?.streak_day ?? 0;
    const avg_7day = last7?.length
      ? last7.reduce((sum, row) => sum + (row.completion_pct ?? 0), 0) / last7.length
      : 0;
    const avg_14day = last14?.length
      ? last14.reduce((sum, row) => sum + (row.completion_pct ?? 0), 0) / last14.length
      : 0;

    const week_history =
      last7?.map((row) => ({ date: row.date as string, pct: row.completion_pct ?? 0 })) ?? [];

    return reply.send(<APIResponse<{
      today_pct: number;
      avg_7day: number;
      avg_14day: number;
      streak: number;
      tier: string;
      week_history: { date: string; pct: number }[];
      din_message: string;
    }>>{
      success: true,
      data: {
        today_pct,
        avg_7day,
        avg_14day,
        streak,
        tier: getDINTier(avg_14day),
        week_history,
        din_message: getToneMessage("start", "Today", streak, today_pct)
      }
    });
  });
}
