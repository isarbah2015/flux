import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { handlePaystackWebhook } from "./routes/billing";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

// Paystack webhook needs the raw body for HMAC signature verification.
app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const raw = req.body instanceof Buffer ? req.body.toString("utf8") : String(req.body);
      const sig = req.headers["x-paystack-signature"] as string | undefined;
      const result = await handlePaystackWebhook(raw, sig);
      res.json({ received: true, ...result });
    } catch (err) {
      logger.warn({ err }, "Paystack webhook rejected");
      res.status(400).json({ error: err instanceof Error ? err.message : "Webhook error" });
    }
  },
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
