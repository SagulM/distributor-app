import { db } from "./db.js";

const seed = db.transaction(() => {
  // 1. Clear existing data in foreign-key-safe order
  db.prepare("DELETE FROM erp_events").run();
  db.prepare("DELETE FROM point_ledger").run();
  db.prepare("DELETE FROM order_events").run();
  db.prepare("DELETE FROM order_items").run();
  db.prepare("DELETE FROM orders").run();
  db.prepare("DELETE FROM products").run();
  db.prepare("DELETE FROM distributors").run();
  db.prepare("DELETE FROM managers").run();

  // 2. Reset auto-increment counters for predictable demo IDs
  db.prepare(
    `
    DELETE FROM sqlite_sequence
    WHERE name IN (
      'products',
      'distributors',
      'managers',
      'orders',
      'order_items',
      'order_events',
      'point_ledger',
      'erp_events'
    )
  `,
  ).run();

  // 3. Insert products
  const insertProduct = db.prepare(`
    INSERT INTO products (sku, name, unit_price, stock_qty)
    VALUES (?, ?, ?, ?)
  `);

  const products = [
    ["SKU-100", "Cooking Oil 1L", 125, 40],
    ["SKU-101", "Rice 5kg", 320, 25],
    ["SKU-102", "Wheat Flour 5kg", 240, 30],
    ["SKU-103", "Sugar 1kg", 55, 100],
    ["SKU-104", "Tea 500g", 180, 15],
    ["SKU-105", "Soap Pack", 90, 1],
    ["SKU-106", "Juice Case", 450, 0],
    ["SKU-107", "Biscuits Carton", 210, 20],
  ];

  for (const product of products) {
    insertProduct.run(...product);
  }

  // 4. Insert distributors with fixed IDs
  const insertDistributor = db.prepare(`
    INSERT INTO distributors (id, name, credit_limit, tier)
    VALUES (?, ?, ?, ?)
  `);

  insertDistributor.run(1, "Chennai Distributors", 5000, "Bronze");

  insertDistributor.run(2, "South Star Wholesale", 20000, "Silver");

  insertDistributor.run(3, "National Retail Supply", 50000, "Gold");

  // 5. Insert sales manager
  db.prepare(
    `
    INSERT INTO managers (name) VALUES (?)
  `,
  ).run("Sales Manager");

  // 6. Insert historical delivered orders
  // These orders establish sample loyalty points for Silver and Gold.
  const insertHistoricalOrder = db.prepare(`
    INSERT INTO orders (
      distributor_id,
      status,
      subtotal,
      discount_percent,
      discount_amount,
      total,
      points_awarded,
      created_at
    )
    VALUES (
      ?,
      'Delivered',
      ?,
      ?,
      ?,
      ?,
      ?,
      datetime('now', '-10 days')
    )
  `);

  const silverOrderId = Number(
    insertHistoricalOrder.run(2, 100000, 3, 3000, 97000, 1500).lastInsertRowid,
  );

  const goldOrderId = Number(
    insertHistoricalOrder.run(3, 100000, 6, 6000, 94000, 5500).lastInsertRowid,
  );

  // 7. Insert historical loyalty point entries
  const insertPointLedger = db.prepare(`
    INSERT INTO point_ledger (
      distributor_id,
      order_id,
      points,
      reason,
      created_at
    )
    VALUES (?, ?, ?, ?, datetime('now', '-10 days'))
  `);

  insertPointLedger.run(2, silverOrderId, 1500, "Seed historical points");

  insertPointLedger.run(3, goldOrderId, 5500, "Seed historical points");
});

// If any operation fails, the transaction rolls back.
seed();

console.log("Seed data created successfully.");
