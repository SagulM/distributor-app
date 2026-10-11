import { Router } from "express";
import {
  postOrder,
  getOrders,
  getOrderById,
  patchOrderStatus,
  getPendingOrders,
} from "../controllers/orderController.js";
const router = Router();
router.get("/", getOrders);
router.get("/pending", getPendingOrders);
router.post("/", postOrder);
router.get("/:id", getOrderById);
router.patch("/:id/status", patchOrderStatus);
export default router;
