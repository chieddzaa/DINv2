// send-nudges: DIN's notification engine (Supabase Edge Function, Deno).
// Runs every minute from pg_cron. For every pending task of every user with
// push notifications on, it sends the right nudge at the right moment:
//   start (at the scheduled minute) -> delay (+10 min) -> miss (+30 min, task marked missed)
// Messages use the same tone algorithm as the app: moment x execution profile x DIN tier.
//
// Secrets (Edge Functions -> Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT (e.g. mailto:you@example.com), CRON_SECRET.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

const WINDOW_DELAY = 10 * 60 * 1000;
const WINDOW_CLOSE = 30 * 60 * 1000;
const LATE_GRACE = 15 * 60 * 1000; // don't send a nudge more than 15 min after its moment

/* ---------------- tone bank (generated from apps/web/index.html) ---------------- */
const TONE: Record<string, Record<string, Record<string, string>>> = {
 A:{ grounding:{start:"{t} is scheduled for now. You don't have to finish it. Open it and give it two minutes.",
      delay:"You're delaying {t}. That's not a failure, but it is a choice. Two minutes. Start there.",
      miss:"{t} slipped past its window. No reset. We recover by acting on the next task.",
      complete:"Done. You started, and starting was the hard part. Your DIN Score reflects it.",
      recovery:"The last one slipped. This one doesn't have to. Open {t} and take the first step."},
     firm:{start:"{t} is up. Skip the warm-up. First step, right now.",
      delay:"Avoidance is talking. {t} is still yours to do. Start the first two minutes.",
      miss:"Missed {t}. You know the pattern. Break it on the next one.",
      complete:"Done. That's avoidance losing. Keep the run going.",
      recovery:"You missed the last window. {t} is how you recover. Begin."},
     direct:{start:"{t}. Now. You already know the first step.",
      delay:"You're circling {t}. Stop circling. Start.",
      miss:"{t} missed. Not like you lately. Next one, on time.",
      complete:"Done. Clean start, clean finish.",
      recovery:"One miss. {t} closes the gap. Go."}},
 P:{ grounding:{start:"{t} is scheduled for now. Aim for a first version, not a perfect one. Start rough.",
      delay:"Waiting for the right moment won't improve {t}. A rough start beats a perfect plan. Begin.",
      miss:"{t} passed its window. It didn't need to be perfect. It needed to be started. The next task is your recovery.",
      complete:"Done. Finished work counts more than perfect work. Your DIN Score reflects it.",
      recovery:"The last one got away. For {t}, done is the standard. Start now."},
     firm:{start:"{t} is up. Good enough to ship is the bar. Start.",
      delay:"You're polishing the plan instead of doing {t}. Start the rough version.",
      miss:"Missed {t}. Standards that stop you starting aren't standards. Next one.",
      complete:"Done. Shipped beats perfect. Keep moving.",
      recovery:"Reset the bar for {t}: finished, not flawless. Go."},
     direct:{start:"{t}. Ship a version today.",
      delay:"Perfect is the delay. Start {t}.",
      miss:"{t} missed. Lower the bar, raise the output.",
      complete:"Done. That's the standard that matters.",
      recovery:"Missed one. {t}, rough and on time."}},
 D:{ grounding:{start:"{t} is scheduled for now. Close the other tabs. This is the one thing.",
      delay:"Your attention has drifted from {t}. That happens. Come back to it now.",
      miss:"{t} passed its window. No reset. Pick the next task and give it your full focus.",
      complete:"Done. You stayed with one thing to the end. That's momentum.",
      recovery:"The last one got lost in the noise. {t} is the one thing now."},
     firm:{start:"{t} is up. One task, one tab, until it's done.",
      delay:"You've wandered from {t}. Name it, return to it, finish it.",
      miss:"Missed {t}. Drift cost you this one. Lock in on the next.",
      complete:"Done. Focus held. Carry it into the next task.",
      recovery:"Back to one thing: {t}. Everything else waits."},
     direct:{start:"{t}. Single focus. Go.",
      delay:"Drifting. Back to {t}.",
      miss:"{t} missed. Tighten the focus.",
      complete:"Done. Focus held.",
      recovery:"Refocus: {t}."}},
 S:{ grounding:{start:"{t} is scheduled for now. You don't need pressure to start. Start while there's time.",
      delay:"You're waiting for urgency on {t}. Start now and you'll finish without the rush.",
      miss:"{t} passed its window. The deadline sprint didn't come in time. Start the next one early.",
      complete:"Done, on time, no last-minute rush. That's how consistency is built.",
      recovery:"The last one ran out of runway. Give {t} a head start. Begin now."},
     firm:{start:"{t} is up. Don't wait for the deadline to make it real. Start.",
      delay:"Saving {t} for later is the pattern. Start it now, at your own pace.",
      miss:"Missed {t}. The sprint never came. Start the next one on the clock.",
      complete:"Done, early. Steady beats the sprint.",
      recovery:"Start {t} on schedule. No sprint needed."},
     direct:{start:"{t}. On the clock, not the deadline.",
      delay:"No waiting for pressure. {t}, now.",
      miss:"{t} missed. Start earlier next time.",
      complete:"Done on schedule. Keep that pace.",
      recovery:"{t}. On time this round."}}
};
const MINIMAL: Record<string, string> = {start:"{t}. Now.", delay:"{t} is waiting.", miss:"Missed. Next.", complete:"Done.", recovery:"{t}. Recover."};
const EVENT_TITLE: Record<string, string> = {start:"Scheduled for now", delay:"Still waiting", miss:"Window closed", complete:"Done", recovery:"Recovery"};
const TIERS = [ 
  {min:90,name:"Elite",coat:"Master of Action",reg:"minimal",regName:"Minimalist, high-trust"},
  {min:80,name:"Sharp",coat:"Execution Leader",reg:"direct",regName:"Direct, peer-to-peer"},
  {min:60,name:"Consistent",coat:"Focused Finisher",reg:"firm",regName:"Firm, encouraging"},
  {min:40,name:"Rising",coat:"Consistent Doer",reg:"grounding",regName:"Supportive, grounding"},
  {min:0,name:"Raw",coat:"Starter Achiever",reg:"grounding",regName:"Supportive, grounding"}
];

/* ---------------- time zones ---------------- */
function tzParts(ts: number, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(ts))) p[x.type] = x.value;
  return p;
}
function tzOffset(ts: number, tz: string): number {
  const p = tzParts(ts, tz);
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUTC - Math.floor(ts / 1000) * 1000;
}
export function localToUtc(date: string, time: string, tz: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off = tzOffset(guess, tz);
  let ts = guess - off;
  const off2 = tzOffset(ts, tz);
  if (off2 !== off) ts = guess - off2;
  return ts;
}
export function localDate(ts: number, tz: string): string {
  const p = tzParts(ts, tz);
  return `${p.year}-${p.month}-${p.day}`;
}
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export function safeTz(tz: string | null | undefined): string {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz || "UTC" }); return tz || "UTC"; } catch { return "UTC"; }
}

/* ---------------- scoring + tone ---------------- */
type Task = { id: string; user_id: string; title: string; scheduled_date: string; scheduled_time: string; status: string };
export function stats(tasks: Task[], today: string) {
  const byDay: Record<string, { done: number; total: number }> = {};
  for (const t of tasks) {
    if (t.scheduled_date < addDays(today, -13) || t.scheduled_date > today) continue;
    const b = (byDay[t.scheduled_date] ||= { done: 0, total: 0 });
    b.total++; if (t.status === "completed") b.done++;
  }
  const pcts: (number | null)[] = [];
  for (let i = 13; i >= 0; i--) { const b = byDay[addDays(today, -i)]; pcts.push(b ? Math.round((b.done / b.total) * 100) : null); }
  const vals = pcts.filter((x): x is number => x !== null);
  const avg14 = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  let streak = 0;
  if ((pcts[13] ?? -1) >= 70) streak = 1;
  for (let j = 12; j >= 0 && pcts[j] !== null && (pcts[j] as number) >= 70; j--) streak++;
  const tier = TIERS.find((t) => avg14 >= t.min) || TIERS[TIERS.length - 1];
  return { avg14, streak, tier };
}
export function toneFor(event: string, title: string, profile: string | null, tier: { reg: string }, streak: number): string {
  let text = tier.reg === "minimal" ? MINIMAL[event] : TONE[profile || "A"][tier.reg][event];
  text = text.replace(/\{t\}/g, title || "This task");
  if (event === "delay" && streak >= 3 && tier.reg !== "minimal") text += ` Your ${streak}-day streak is on the line.`;
  return text;
}

/* ---------------- which nudge is due ---------------- */
export function dueEvent(now: number, ts: number): "start" | "delay" | "miss" | null {
  if (now >= ts + WINDOW_CLOSE) return "miss";
  if (now >= ts + WINDOW_DELAY) return "delay";
  if (now >= ts) return "start";
  return null;
}
export function isFresh(now: number, ts: number, ev: string): boolean {
  const at = ev === "start" ? ts : ev === "delay" ? ts + WINDOW_DELAY : ts + WINDOW_CLOSE;
  return now - at <= LATE_GRACE;
}

/* ---------------- the job ---------------- */
async function run(now: number) {
  const { createClient } = await import("npm:@supabase/supabase-js@2.45.4");
  const webpush = (await import("npm:web-push@3.6.7")).default;
  const env = (k: string) => Deno.env.get(k) || "";
  webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:hello@doingitnow.app", env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  const { data: subs, error: subErr } = await db.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth");
  if (subErr) throw subErr;
  const byUser: Record<string, typeof subs> = {};
  for (const s of subs || []) (byUser[s.user_id] ||= []).push(s);
  const userIds = Object.keys(byUser);
  const report = { users: userIds.length, sent: 0, missedMarked: 0, removedSubs: 0, errors: 0 };
  if (!userIds.length) return report;

  const { data: users } = await db.from("users").select("id,timezone,execution_profile").in("id", userIds);
  const utcToday = new Date(now).toISOString().slice(0, 10);
  const { data: tasks } = await db.from("tasks").select("id,user_id,title,scheduled_date,scheduled_time,status")
    .in("user_id", userIds).gte("scheduled_date", addDays(utcToday, -15)).lte("scheduled_date", addDays(utcToday, 1));

  for (const u of users || []) {
    const tz = safeTz(u.timezone);
    const today = localDate(now, tz);
    const mine = (tasks || []).filter((t: Task) => t.user_id === u.id);
    const pending = mine.filter((t: Task) => t.status === "pending")
      .map((t: Task) => ({ t, ts: localToUtc(t.scheduled_date, String(t.scheduled_time).slice(0, 5), tz) }))
      .sort((a, b) => a.ts - b.ts);
    for (const { t, ts } of pending) {
      const ev = dueEvent(now, ts);
      if (!ev) continue;
      if (ev === "miss") {
        await db.from("tasks").update({ status: "missed" }).eq("id", t.id).eq("status", "pending");
        t.status = "missed"; report.missedMarked++;
      }
      if (!isFresh(now, ts, ev)) continue;
      // claim this nudge exactly once (unique task_id + type)
      const { data: claimed } = await db.from("notification_logs")
        .upsert({ user_id: u.id, task_id: t.id, type: ev }, { onConflict: "task_id,type", ignoreDuplicates: true }).select("id");
      if (!claimed || !claimed.length) continue;
      const st = stats(mine, today);
      let moment: string = ev;
      if (ev === "start") {
        const closed = mine.filter((x: Task) => x.scheduled_date === today && x.status !== "pending" && x.id !== t.id)
          .map((x: Task) => ({ x, ts: localToUtc(x.scheduled_date, String(x.scheduled_time).slice(0, 5), tz) }))
          .filter((o) => o.ts < ts).sort((a, b) => a.ts - b.ts);
        if (closed.length && closed[closed.length - 1].x.status === "missed") moment = "recovery";
      }
      const payload = JSON.stringify({
        title: EVENT_TITLE[moment], body: toneFor(moment, t.title, u.execution_profile, st.tier, st.streak),
        tag: `${t.id}-${ev}`, url: "./",
      });
      for (const s of byUser[u.id]) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 900, urgency: "high" });
          report.sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) { await db.from("push_subscriptions").delete().eq("id", s.id); report.removedSubs++; }
          else { report.errors++; console.error("push failed", code, (e as Error).message); }
        }
      }
    }
  }
  return report;
}

if (typeof Deno !== "undefined" && Deno.serve) {
  Deno.serve(async (req) => {
    if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("Forbidden", { status: 403 });
    try {
      const report = await run(Date.now());
      return new Response(JSON.stringify(report), { headers: { "content-type": "application/json" } });
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: { "content-type": "application/json" } });
    }
  });
}
