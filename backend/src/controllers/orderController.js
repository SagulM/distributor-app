import {
  createOrder,
  listOrders,
  getOrder,
  changeStatus,
  pendingOrders,
} from "../services/orderService.js";
export function postOrder(req, res) {
  try {
    const order = createOrder({
      ...req.body,
      actor: req.body.actor || "Distributor",
      idempotencyKey: req.get("Idempotency-Key") || req.body.idempotencyKey,
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}
export function getOrders(req, res) {
  res.json(listOrders());
}
export function getOrderById(req, res) {
  try {
    res.json(getOrder(req.params.id));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}
export function patchOrderStatus(req, res) {
  try {
    res.json(
      changeStatus(
        req.params.id,
        req.body.status,
        req.body.actor || "Sales Manager",
      ),
    );
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}
export function getPendingOrders(req, res) {
  res.json(pendingOrders());
}
