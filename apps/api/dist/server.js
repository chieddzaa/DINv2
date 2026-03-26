"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const sensible_1 = __importDefault(require("@fastify/sensible"));
const auth_1 = require("./plugins/auth");
const tasks_1 = require("./routes/tasks");
const scores_1 = require("./routes/scores");
const notifications_1 = require("./routes/notifications");
const subscriptions_1 = require("./routes/subscriptions");
const notificationCron_1 = require("./cron/notificationCron");
const PORT = Number(process.env.PORT || "3001");
async function bootstrap() {
    const app = (0, fastify_1.default)({ logger: true });
    await app.register(cors_1.default, { origin: true });
    await app.register(jwt_1.default, { secret: process.env.JWT_SECRET || "dev-secret" });
    await app.register(sensible_1.default);
    await app.register(auth_1.authPlugin);
    app.get("/health", async () => ({
        ok: true,
        service: "din-api"
    }));
    await app.register(tasks_1.registerTaskRoutes, { prefix: "/tasks" });
    await app.register(scores_1.registerScoreRoutes, { prefix: "/scores" });
    await app.register(notifications_1.registerNotificationRoutes, { prefix: "/notifications" });
    await app.register(subscriptions_1.registerSubscriptionRoutes, { prefix: "/subscriptions" });
    (0, notificationCron_1.startNotificationCron)(app);
    await app.listen({ port: PORT, host: "0.0.0.0" });
}
bootstrap().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
});
