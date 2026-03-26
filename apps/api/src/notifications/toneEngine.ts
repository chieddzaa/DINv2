export function getToneMessage(
  type: "start" | "delay" | "miss" | "recovery",
  taskTitle: string,
  streakDays: number,
  completionPct: number
): string {
  switch (type) {
    case "start":
      return `Time to execute. ${taskTitle} is up.`;
    case "delay":
      if (streakDays >= 7) return "You've built something real. Protect it.";
      if (streakDays >= 3) return "You've been consistent. Don't break it now.";
      return "Still time. Don't let this one slip.";
    case "miss":
      return "Missed. Recovery starts with the next one.";
    case "recovery":
      return "Back at it. One task at a time.";
  }
}
