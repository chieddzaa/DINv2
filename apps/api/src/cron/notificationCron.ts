import cron from "node-cron";
import { FastifyInstance } from "fastify";

export function startNotificationCron(app: FastifyInstance) {
  cron.schedule("* * * * *", () => {
    app.log.info("notification cron tick");
  });
}
