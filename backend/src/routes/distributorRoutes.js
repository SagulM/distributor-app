import { Router } from "express";
import {
  getDistributors,
  getDistributorSummary,
} from "../controllers/distributorController.js";
const router = Router();
router.get("/", getDistributors);
router.get("/:id/summary", getDistributorSummary);
export default router;
