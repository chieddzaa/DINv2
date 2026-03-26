import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import { authPlugin } from "./plugins/auth";
import { registerTaskRoutes } from "./routes/tasks";
import { registerScoreRoutes } from "./routes/scores";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerSubscriptionRoutes } from "./routes/subscriptions";
import { startNotificationCron } from "./cron/notificationCron";

const PORT = Number(process.env.PORT || "3001");

async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: process.env.JWT_SECRET || "dev-secret" });
  await app.register(sensible);
  await app.register(authPlugin);

  app.get("/health", async () => ({
    ok: true,
    service: "din-api"
  }));

  await app.register(registerTaskRoutes, { prefix: "/tasks" });
  await app.register(registerScoreRoutes, { prefix: "/scores" });
  await app.register(registerNotificationRoutes, { prefix: "/notifications" });
  await app.register(registerSubscriptionRoutes, { prefix: "/subscriptions" });

  startNotificationCron(app);

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
