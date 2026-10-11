import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./db.js";
import productRoutes from "./routes/productRoutes.js";
import distributorRoutes from "./routes/distributorRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/products", productRoutes);
app.use("/api/distributors", distributorRoutes);
app.use("/api/orders", orderRoutes);
app.post("/mock-erp", (req, res) => {
  console.log("Mock ERP received:", req.body);
  res.status(202).json({ received: true });
});
app.get("/api/erp-events", (req, res) =>
  res.json(db.prepare("SELECT * FROM erp_events ORDER BY id DESC").all()),
);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running at http://localhost:${port}`));
