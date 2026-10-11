import { distributorModel } from "../models/distributorModel.js";
import { distributorSummary } from "../services/orderService.js";
export function getDistributors(req, res) {
  res.json(distributorModel.all());
}
export function getDistributorSummary(req, res) {
  try {
    res.json(distributorSummary(req.params.id));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
}
