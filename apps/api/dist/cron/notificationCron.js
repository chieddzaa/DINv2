"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startNotificationCron = startNotificationCron;
const node_cron_1 = __importDefault(require("node-cron"));
function startNotificationCron(app) {
    node_cron_1.default.schedule("* * * * *", () => {
        app.log.info("notification cron tick");
    });
}
