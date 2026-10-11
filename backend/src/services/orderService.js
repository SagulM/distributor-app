import { db } from "../db.js";
import { productModel } from "../models/productModel.js";
import { orderModel } from "../models/orderModel.js";
import {
  addPoints,
  recalculateTier,
  pointsInLast90Days,
} from "./loyaltyService.js";
import { queueErpEvent } from "./erpService.js";

const discounts = { Bronze: 0, Silver: 3, Gold: 6 };
const allowed = {
  Placed: ["Confirmed", "PendingApproval", "Cancelled"],
  PendingApproval: ["Confirmed", "Rejected", "Cancelled"],
  Confirmed: ["Dispatched", "Cancelled"],
  Dispatched: ["Delivered"],
  Delivered: [],
  Rejected: [],
  Cancelled: [],
};
const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });

function recordStatus(orderId, fromStatus, toStatus, actor) {
  db.prepare(
    "INSERT INTO order_events (order_id,from_status,to_status,actor) VALUES (?,?,?,?)",
  ).run(orderId, fromStatus ?? null, toStatus, actor);
  queueErpEvent(orderId, fromStatus, toStatus, actor);
}
function awardPoints(order) {
  const points = Math.floor(order.total / 100);
  db.prepare("UPDATE orders SET points_awarded=? WHERE id=?").run(
    points,
    order.id,
  );
  addPoints(order.distributor_id, order.id, points, "Order confirmed");
}

const createOrderTransaction = db.transaction(
  ({ distributorId, items, actor = "Distributor", idempotencyKey }) => {
    if (idempotencyKey) {
      const old = db
        .prepare("SELECT id FROM orders WHERE idempotency_key=?")
        .get(idempotencyKey);
      if (old) return getOrder(old.id);
    }
    const distributor = db
      .prepare("SELECT * FROM distributors WHERE id=?")
      .get(Number(distributorId));
    if (!distributor) throw fail("Distributor not found", 404);
    if (!Array.isArray(items) || items.length === 0)
      throw fail("At least one line item is required");

    // Merge duplicate product IDs so the same SKU cannot be checked/reserved twice incorrectly.
    const quantities = new Map();
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      if (
        !Number.isInteger(productId) ||
        !Number.isInteger(quantity) ||
        quantity < 1
      )
        throw fail(
          "Each item needs a valid productId and a positive integer quantity",
        );
      quantities.set(productId, (quantities.get(productId) || 0) + quantity);
    }

    const lines = [];
    let subtotal = 0;
    for (const [productId, quantity] of quantities) {
      const product = productModel.byId(productId);
      if (!product) throw fail(`Product ${productId} not found`);
      if (product.stock_qty < quantity)
        throw fail(
          `SKU ${product.sku}: requested ${quantity}, available ${product.stock_qty}`,
        );
      lines.push({
        product,
        quantity,
        lineTotal: product.unit_price * quantity,
      });
      subtotal += product.unit_price * quantity;
    }

    const discountPercent = discounts[distributor.tier] ?? 0;
    const discountAmount = Math.round(subtotal * discountPercent) / 100;
    const total = Math.round((subtotal - discountAmount) * 100) / 100;
    const outstanding = db
      .prepare(
        `SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE distributor_id=? AND status NOT IN ('Delivered','Cancelled','Rejected')`,
      )
      .get(distributor.id).total;
    const availableCredit = distributor.credit_limit - outstanding;
    const status = total <= availableCredit ? "Confirmed" : "PendingApproval";

    // Stock check + reservation run inside one SQLite transaction. Conditional updates guard stock too.
    for (const line of lines) {
      const result = db
        .prepare(
          "UPDATE products SET stock_qty=stock_qty-? WHERE id=? AND stock_qty>=?",
        )
        .run(line.quantity, line.product.id, line.quantity);
      if (result.changes !== 1)
        throw fail(`SKU ${line.product.sku}: stock changed; please retry`);
    }
    const result = db
      .prepare(
        `INSERT INTO orders (distributor_id,status,subtotal,discount_percent,discount_amount,total,idempotency_key)
    VALUES (?,?,?,?,?,?,?)`,
      )
      .run(
        distributor.id,
        status,
        subtotal,
        discountPercent,
        discountAmount,
        total,
        idempotencyKey || null,
      );
    const orderId = Number(result.lastInsertRowid);
    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id,product_id,sku,product_name,quantity,unit_price,line_total) VALUES (?,?,?,?,?,?,?)`,
    );
    for (const line of lines)
      insertItem.run(
        orderId,
        line.product.id,
        line.product.sku,
        line.product.name,
        line.quantity,
        line.product.unit_price,
        line.lineTotal,
      );
    recordStatus(orderId, null, "Placed", actor);
    if (status === "Confirmed") {
      recordStatus(orderId, "Placed", "Confirmed", "System");
      awardPoints({ id: orderId, distributor_id: distributor.id, total });
    } else {
      recordStatus(orderId, "Placed", "PendingApproval", "System");
    }
    return getOrder(orderId);
  },
);
export function createOrder(input) {
  return createOrderTransaction(input);
}

export function getOrder(id) {
  const order = orderModel.byId(Number(id));
  if (!order) throw fail("Order not found", 404);
  return {
    ...order,
    items: orderModel.items(order.id),
    events: orderModel.events(order.id),
  };
}
export function listOrders() {
  return orderModel.all();
}
export function pendingOrders() {
  return orderModel.pending();
}

const changeStatusTransaction = db.transaction(
  (id, nextStatus, actor = "Sales Manager") => {
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(Number(id));
    if (!order) throw fail("Order not found", 404);
    if (!(allowed[order.status] || []).includes(nextStatus))
      throw fail(`Transition ${order.status} -> ${nextStatus} is not allowed`);

    if (nextStatus === "Confirmed") {
      const outstanding = db
        .prepare(
          `SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE distributor_id=? AND id<>? AND status NOT IN ('Delivered','Cancelled','Rejected')`,
        )
        .get(order.distributor_id, order.id).total;
      const distributor = db
        .prepare("SELECT credit_limit FROM distributors WHERE id=?")
        .get(order.distributor_id);
      if (order.total > distributor.credit_limit - outstanding)
        throw fail("Order still exceeds available credit");
    }
    db.prepare("UPDATE orders SET status=? WHERE id=?").run(
      nextStatus,
      order.id,
    );
    recordStatus(order.id, order.status, nextStatus, actor);

    if (nextStatus === "Confirmed") awardPoints(order);
    if (nextStatus === "Cancelled" || nextStatus === "Rejected") {
      if (!order.reservation_released) {
        const items = orderModel.items(order.id);
        const restore = db.prepare(
          "UPDATE products SET stock_qty=stock_qty+? WHERE id=?",
        );
        for (const item of items) restore.run(item.quantity, item.product_id);
        db.prepare("UPDATE orders SET reservation_released=1 WHERE id=?").run(
          order.id,
        );
      }
      if (
        nextStatus === "Cancelled" &&
        order.status === "Confirmed" &&
        order.points_awarded > 0
      ) {
        addPoints(
          order.distributor_id,
          order.id,
          -order.points_awarded,
          "Confirmed order cancelled",
        );
        db.prepare("UPDATE orders SET points_awarded=0 WHERE id=?").run(
          order.id,
        );
      }
      recalculateTier(order.distributor_id);
    }
    // Stock was already reserved (removed from available quantity) when placed.
    // Dispatch makes that reservation permanent, so no additional stock update is required.
    return getOrder(order.id);
  },
);
export function changeStatus(id, nextStatus, actor) {
  return changeStatusTransaction(id, nextStatus, actor);
}

export function distributorSummary(id) {
  const distributor = db
    .prepare("SELECT * FROM distributors WHERE id=?")
    .get(Number(id));
  if (!distributor) throw fail("Distributor not found", 404);
  const points = pointsInLast90Days(distributor.id);
  const tier = points >= 5000 ? "Gold" : points >= 1000 ? "Silver" : "Bronze";
  db.prepare("UPDATE distributors SET tier=? WHERE id=?").run(
    tier,
    distributor.id,
  );
  return { ...distributor, tier, points };
}
