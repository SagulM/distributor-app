import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import toast, { Toaster } from "react-hot-toast";
import "./style.css";

const API = "http://localhost:4000/api";

function App() {
  const [products, setProducts] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [distributorId, setDistributorId] = useState("1");
  const [summary, setSummary] = useState(null);
  const [cart, setCart] = useState({});
  const [orders, setOrders] = useState([]);
  const [pending, setPending] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  }

  async function refresh() {
    try {
      const [p, d, o, q, s] = await Promise.all([
        request("/products"),
        request("/distributors"),
        request("/orders"),
        request("/orders/pending"),
        request(`/distributors/${distributorId}/summary`),
      ]);

      setProducts(p);
      setDistributors(d);
      setOrders(o);
      setPending(q);
      setSummary(s);
    } catch (error) {
      toast.error(error.message || "Failed to load data");
    }
  }

  useEffect(() => {
    refresh();
  }, [distributorId]);

  async function placeOrder() {
    const items = Object.entries(cart)
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([productId, quantity]) => ({
        productId: Number(productId),
        quantity: Number(quantity),
      }));

    if (!items.length) {
      toast.error("Choose at least one product quantity.");
      return;
    }

    try {
      const key = crypto.randomUUID();

      const order = await request("/orders", {
        method: "POST",
        headers: {
          "Idempotency-Key": key,
        },
        body: JSON.stringify({
          distributorId: Number(distributorId),
          items,
          actor: "Distributor",
        }),
      });

      setCart({});

      toast.success(`Order #${order.id} created with status ${order.status}.`);

      await refresh();

      setSelectedOrder(await request(`/orders/${order.id}`));
    } catch (error) {
      toast.error(error.message || "Failed to place order");
      await refresh();
    }
  }

  async function updateStatus(orderId, status) {
    try {
      await request(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          actor: status === "Cancelled" ? "Distributor" : "Sales Manager",
        }),
      });

      toast.success(`Order #${orderId}: ${status}`);

      await refresh();

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(await request(`/orders/${orderId}`));
      }
    } catch (error) {
      toast.error(error.message || "Failed to update order");
    }
  }

  async function viewOrder(orderId) {
    try {
      const order = await request(`/orders/${orderId}`);
      setSelectedOrder(order);
    } catch (error) {
      toast.error(error.message || "Failed to load order details");
    }
  }

  return (
    <main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          success: {
            duration: 3000,
          },
          error: {
            duration: 4000,
          },
        }}
      />

      <header>
        <div>
          <h1>Distributor Order Portal</h1>
          <p>Catalogue · Orders · Inventory · Loyalty</p>
        </div>

        <label>
          Act as distributor
          <select
            value={distributorId}
            onChange={(e) => setDistributorId(e.target.value)}
          >
            {distributors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {summary && (
        <section className="stats">
          <div>
            <small>Loyalty tier</small>
            <strong>{summary.tier}</strong>
          </div>

          <div>
            <small>Points (90 days)</small>
            <strong>{summary.points}</strong>
          </div>

          <div>
            <small>Credit limit</small>
            <strong>₹{summary.credit_limit.toLocaleString()}</strong>
          </div>
        </section>
      )}

      <section>
        <h2>Product catalogue</h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Unit price</th>
                <th>Available stock</th>
                <th>Quantity</th>
              </tr>
            </thead>

            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td>₹{p.unit_price.toFixed(2)}</td>
                  <td>{p.stock_qty}</td>
                  <td>
                    <input
                      aria-label={`Quantity ${p.sku}`}
                      type="number"
                      min="0"
                      max={p.stock_qty}
                      disabled={p.stock_qty === 0}
                      value={cart[p.id] || ""}
                      onChange={(e) =>
                        setCart({
                          ...cart,
                          [p.id]: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button className="primary" onClick={placeOrder}>
          Place order
        </button>
      </section>

      <section>
        <h2>Sales manager queue</h2>

        {pending.length === 0 ? (
          <p>No orders awaiting approval.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Distributor</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {pending.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{o.distributor_name}</td>
                    <td>₹{o.total.toFixed(2)}</td>
                    <td>
                      <button onClick={() => updateStatus(o.id, "Confirmed")}>
                        Approve
                      </button>{" "}
                      <button
                        className="danger"
                        onClick={() => updateStatus(o.id, "Rejected")}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>Orders</h2>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Distributor</th>
                <th>Status</th>
                <th>Discount</th>
                <th>Total</th>
                <th>View / actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.distributor_name}</td>
                  <td>{o.status}</td>
                  <td>{o.discount_percent}%</td>
                  <td>₹{o.total.toFixed(2)}</td>

                  <td>
                    <button onClick={() => viewOrder(o.id)}>Details</button>

                    {["Placed", "PendingApproval", "Confirmed"].includes(
                      o.status,
                    ) && (
                      <>
                        {" "}
                        <button
                          className="danger"
                          onClick={() => updateStatus(o.id, "Cancelled")}
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {o.status === "Confirmed" && (
                      <>
                        {" "}
                        <button
                          onClick={() => updateStatus(o.id, "Dispatched")}
                        >
                          Dispatch
                        </button>
                      </>
                    )}

                    {o.status === "Dispatched" && (
                      <>
                        {" "}
                        <button onClick={() => updateStatus(o.id, "Delivered")}>
                          Deliver
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <section>
          <div className="section-title">
            <h2>Order #{selectedOrder.id} details</h2>

            <button onClick={() => setSelectedOrder(null)}>Close</button>
          </div>

          <p>
            Status: <b>{selectedOrder.status}</b> · Discount:{" "}
            {selectedOrder.discount_percent}% (₹
            {selectedOrder.discount_amount.toFixed(2)}) · Total:{" "}
            <b>₹{selectedOrder.total.toFixed(2)}</b>
          </p>

          <h3>Items</h3>

          <ul>
            {selectedOrder.items.map((i) => (
              <li key={i.id}>
                {i.sku} — {i.product_name} × {i.quantity} @ ₹
                {i.unit_price.toFixed(2)}
              </li>
            ))}
          </ul>

          <h3>Order event log</h3>

          <ul>
            {selectedOrder.events.map((e) => (
              <li key={e.id}>
                {e.from_status || "New"} → {e.to_status} by {e.actor} at{" "}
                {e.created_at}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
