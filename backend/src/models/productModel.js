import { db } from "../db.js";
export const productModel = {
  all: () => db.prepare("SELECT * FROM products ORDER BY name").all(),
  byId: (id) => db.prepare("SELECT * FROM products WHERE id = ?").get(id),
};
