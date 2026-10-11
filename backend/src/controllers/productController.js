import { productModel } from "../models/productModel.js";
export function getProducts(req, res) {
  res.json(productModel.all());
}
