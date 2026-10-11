import { db } from "../db.js";

// Assessment-friendly outbound integration. A failed call stays in the table for retry.
export async function sendErpEvent(eventId) {
  const event = db.prepare("SELECT * FROM erp_events WHERE id=?").get(eventId);
  if (!event || event.delivered) return;
  const url = process.env.ERP_URL;
  try {
    if (url) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: event.payload,
        signal: AbortSignal.timeout(2500),
      });
      if (!response.ok) throw new Error(`ERP returned HTTP ${response.status}`);
    }
    db.prepare(
      "UPDATE erp_events SET delivered=1, attempts=attempts+1, last_error=NULL WHERE id=?",
    ).run(eventId);
  } catch (error) {
    db.prepare(
      "UPDATE erp_events SET attempts=attempts+1, last_error=? WHERE id=?",
    ).run(error.message, eventId);
    // Small bounded retry with exponential backoff for the time-limited assessment.
    if (event.attempts < 2) {
      await new Promise((resolve) =>
        setTimeout(resolve, 300 * 2 ** event.attempts),
      );
      await sendErpEvent(eventId);
    }
  }
}
export function queueErpEvent(orderId, fromStatus, toStatus, actor) {
  const payload = JSON.stringify({
    orderId,
    fromStatus,
    toStatus,
    actor,
    occurredAt: new Date().toISOString(),
  });
  const result = db
    .prepare(
      "INSERT INTO erp_events (order_id,from_status,to_status,payload) VALUES (?,?,?,?)",
    )
    .run(orderId, fromStatus ?? null, toStatus, payload);
  void sendErpEvent(Number(result.lastInsertRowid));
}
