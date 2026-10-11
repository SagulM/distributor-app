import { db } from "../db.js";

export function pointsInLast90Days(distributorId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(points),0) AS total FROM point_ledger
    WHERE distributor_id=? AND created_at >= datetime('now','-90 days')`,
    )
    .get(distributorId);
  return row.total;
}
export function recalculateTier(distributorId) {
  const points = pointsInLast90Days(distributorId);
  const tier = points >= 5000 ? "Gold" : points >= 1000 ? "Silver" : "Bronze";
  db.prepare("UPDATE distributors SET tier=? WHERE id=?").run(
    tier,
    distributorId,
  );
  return { points, tier };
}
export function addPoints(distributorId, orderId, points, reason) {
  db.prepare(
    "INSERT INTO point_ledger (distributor_id,order_id,points,reason) VALUES (?,?,?,?)",
  ).run(distributorId, orderId, points, reason);
  return recalculateTier(distributorId);
}
export function getLoyalty(distributorId) {
  const result = recalculateTier(distributorId);
  return result;
}
