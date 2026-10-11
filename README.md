# Distributor Order Portal

This project is a simple order management app for distributors and sales managers. Distributors can view products, check stock, place orders, and see order status. Managers can review orders that need approval. The app also includes credit checks, loyalty points, and ERP event logging.

## What you need

- Node.js 22
- npm

## Run the project

Open two terminals from the project folder.

**Terminal 1 — backend**

```bash
cd backend
npm install
npm run seed
npm run dev
```

**Terminal 2 — frontend**

```bash
cd frontend
npm install
npm run dev
```

Open the frontend URL shown in the terminal. It is usually `http://localhost:5173`.

To check whether the backend is running, open `http://localhost:4000/api/health`.

## Demo data

The seed command adds sample distributors and products. The sample data includes products with no stock and products with only one item in stock, so stock checks can be tried out.

To reset the sample data, run `npm run seed` again from the `backend` folder.

## Main API endpoints

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/api/products` | Shows products and available stock |
| GET | `/api/distributors` | Shows the sample distributors |
| GET | `/api/distributors/:id/summary` | Shows a distributor's loyalty points and tier |
| POST | `/api/orders` | Creates an order |
| GET | `/api/orders` | Shows orders |
| GET | `/api/orders/pending` | Shows orders waiting for approval |
| GET | `/api/orders/:id` | Shows an order and its event history |
| PATCH | `/api/orders/:id/status` | Changes an order's status |
| GET | `/api/erp-events` | Shows ERP event attempts |

Example order request:

```json
{
  "distributorId": 2,
  "items": [{ "productId": 1, "quantity": 2 }],
  "actor": "Distributor"
}
```
