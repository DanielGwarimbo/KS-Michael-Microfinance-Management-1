import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import loansRouter from "./loans";
import repaymentsRouter from "./repayments";
import usersRouter from "./users";
import accountingRouter from "./accounting";
import reportsRouter from "./reports";
import auditRouter from "./audit";
import documentsRouter from "./documents";
import rolesRouter from "./roles";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clientsRouter);
router.use(loansRouter);
router.use(repaymentsRouter);
router.use(usersRouter);
router.use(accountingRouter);
router.use(reportsRouter);
router.use(auditRouter);
router.use(documentsRouter);
router.use(rolesRouter);
router.use(dashboardRouter);

export default router;
