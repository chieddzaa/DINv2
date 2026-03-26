"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToneMessage = getToneMessage;
function getToneMessage(type, taskTitle, streakDays, completionPct) {
    switch (type) {
        case "start":
            return `Time to execute. ${taskTitle} is up.`;
        case "delay":
            if (streakDays >= 7)
                return "You've built something real. Protect it.";
            if (streakDays >= 3)
                return "You've been consistent. Don't break it now.";
            return "Still time. Don't let this one slip.";
        case "miss":
            return "Missed. Recovery starts with the next one.";
        case "recovery":
            return "Back at it. One task at a time.";
    }
}
