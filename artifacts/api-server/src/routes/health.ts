import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getFluxEnv } from "../lib/flux-env";
import {
  isPaystackConfigured,
  paystackMode,
  premiumPricePayload,
} from "../lib/paystack";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/** No auth — mobile Settings reads Paystack availability before login. */
router.get("/paystack/status", (_req, res) => {
  res.json({
    fluxEnv: getFluxEnv(),
    paystackConfigured: isPaystackConfigured(),
    paystackMode: paystackMode(),
    ...premiumPricePayload(),
  });
});

export default router;
