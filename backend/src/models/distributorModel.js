import { db } from "../db.js";
export const distributorModel = {
  all: () => db.prepare("SELECT * FROM distributors ORDER BY id").all(),
  byId: (id) => db.prepare("SELECT * FROM distributors WHERE id = ?").get(id),
};
