import { Router, type IRouter } from "express";
import healthRouter from "./health";
import screenshotsRouter from "./screenshots";
import billingRouter from "./billing";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(screenshotsRouter);
router.use(billingRouter);
router.use(profileRouter);

export default router;
