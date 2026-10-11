import { db } from "../db.js";
export const orderModel = {
  all: () =>
    db
      .prepare(
        `SELECT o.*, d.name AS distributor_name FROM orders o JOIN distributors d ON d.id=o.distributor_id ORDER BY o.id DESC`,
      )
      .all(),
  byId: (id) =>
    db
      .prepare(
        `SELECT o.*, d.name AS distributor_name, d.tier AS current_tier FROM orders o JOIN distributors d ON d.id=o.distributor_id WHERE o.id=?`,
      )
      .get(id),
  items: (id) =>
    db.prepare("SELECT * FROM order_items WHERE order_id=?").all(id),
  events: (id) =>
    db
      .prepare("SELECT * FROM order_events WHERE order_id=? ORDER BY id")
      .all(id),
  pending: () =>
    db
      .prepare(
        `SELECT o.*, d.name AS distributor_name FROM orders o JOIN distributors d ON d.id=o.distributor_id WHERE o.status='PendingApproval' ORDER BY o.id`,
      )
      .all(),
};
