# Distributor Order Portal

The Distributor Order Portal helps distributors place orders and helps sales managers manage approvals in one place.

## What it can do

- Show products, prices, and available stock.
- Let distributors place an order with more than one product.
- Check stock before accepting an order.
- Check the distributor's credit limit and send orders for approval when needed.
- Apply the distributor's current loyalty discount when the order is created.
- Add loyalty points to confirmed orders and reverse eligible points when an order is cancelled.
- Show order status and a history of status changes.
- Send order status events to an ERP endpoint and keep a log of the attempts.

## How it works

The frontend is built with React. It sends requests to a Node.js and Express API. The backend applies the order rules and stores the data in SQLite.

When an order is placed, the app checks stock and reserves the requested items. If the order is cancelled or rejected before dispatch, the reserved stock is returned. If the distributor does not have enough available credit, the order waits for a manager's decision.

## Before using it for real business

The app needs login and role permissions, a real ERP connection, and more automated tests. Product and distributor data should also be checked before importing it. I would test it with a small group of users before making it available to everyone.
