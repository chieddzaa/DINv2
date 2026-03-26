"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDINScore = calculateDINScore;
exports.getDINTier = getDINTier;
const supabaseClient_1 = require("../supabaseClient");
async function calculateDINScore(userId, date) {
    const { data: tasks, error: taskError } = await supabaseClient_1.supabaseAdmin
        .from("tasks")
        .select("id,status")
        .eq("user_id", userId)
        .eq("scheduled_date", date);
    if (taskError)
        throw taskError;
    const total = tasks?.length ?? 0;
    const completed = tasks?.filter((task) => task.status === "completed").length ?? 0;
    const completionPct = total === 0 ? 0 : (completed / total) * 100;
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().slice(0, 10);
    const { data: yesterdayScore } = await supabaseClient_1.supabaseAdmin
        .from("din_scores")
        .select("streak_day")
        .eq("user_id", userId)
        .eq("date", yesterdayDate)
        .maybeSingle();
    const prevStreak = yesterdayScore?.streak_day ?? 0;
    const streakDay = completionPct >= 70 ? prevStreak + 1 : 0;
    const { error: upsertError } = await supabaseClient_1.supabaseAdmin.from("din_scores").upsert({
        user_id: userId,
        date,
        completion_pct: completionPct,
        streak_day: streakDay
    }, {
        onConflict: "user_id,date"
    });
    if (upsertError)
        throw upsertError;
    return { completionPct, streakDay };
}
function getDINTier(avg14day) {
    if (avg14day >= 90)
        return "Elite";
    if (avg14day >= 80)
        return "Sharp";
    if (avg14day >= 60)
        return "Consistent";
    if (avg14day >= 40)
        return "Rising";
    return "Raw";
}
