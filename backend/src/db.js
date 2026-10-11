import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const db = new Database(path.join(here, "../app.db"));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  unit_price REAL NOT NULL CHECK(unit_price >= 0), stock_qty INTEGER NOT NULL CHECK(stock_qty >= 0)
);
CREATE TABLE IF NOT EXISTS distributors (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, credit_limit REAL NOT NULL CHECK(credit_limit >= 0), tier TEXT NOT NULL DEFAULT 'Bronze'
);
CREATE TABLE IF NOT EXISTS managers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, distributor_id INTEGER NOT NULL REFERENCES distributors(id),
  status TEXT NOT NULL CHECK(status IN ('Placed','PendingApproval','Confirmed','Rejected','Dispatched','Delivered','Cancelled')),
  subtotal REAL NOT NULL, discount_percent INTEGER NOT NULL, discount_amount REAL NOT NULL, total REAL NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0, reservation_released INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id), sku TEXT NOT NULL, product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0), unit_price REAL NOT NULL CHECK(unit_price >= 0), line_total REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id),
  from_status TEXT, to_status TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS point_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT, distributor_id INTEGER NOT NULL REFERENCES distributors(id),
  order_id INTEGER NOT NULL REFERENCES orders(id), points INTEGER NOT NULL, reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS erp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id),
  from_status TEXT, to_status TEXT NOT NULL, payload TEXT NOT NULL, delivered INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
