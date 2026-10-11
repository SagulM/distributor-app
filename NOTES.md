# Engineering Notes

## 1. How I built it

I used React for the frontend and Node.js with Express for the backend. The frontend calls the backend through API endpoints. I kept the backend code in separate route, controller, service, and model files so each part has a clear job.

The route files define the URLs. Controllers read the request and send the response. Services contain the main rules for orders, loyalty points, and ERP events. Model files handle database queries. SQLite stores the data, and the database setup file creates the tables and enables foreign-key checks.

When an order is placed, the backend checks the requested stock and updates it in a database transaction. The stock check is done in the backend as well as the frontend. This is important because a user should not be able to order more items just by changing the browser request.

## 2. Main decisions

- **SQLite:** I used SQLite because it is easy to run locally and does not need a separate database server for this assessment. For a larger application running on several servers, I would consider a server database.
- **Stock handling:** The available stock number is reduced when an order is placed. If the order is cancelled or rejected before dispatch, the stock is returned once. After dispatch, the stock is not returned by this flow.
- **Loyalty points:** I used a points ledger instead of keeping only one points balance. This makes it easier to see points being added or reversed. The summary uses points from the last 90 days.
- **Order discount:** The discount is saved with the order when it is created. If the distributor's tier changes later, the old order total does not change.
- **ERP events:** The app sends status-change events to an ERP endpoint. By default, it uses a local mock endpoint so the flow can be tried without real ERP credentials.
- **User identity:** Login was outside the assessment scope, so the demo uses a distributor selector and an actor label. A real application should get the user's identity from a secure login session instead.

## 3. What still needs work

I have not added an automated test that sends two order requests at the same time for the last item in stock. The database transaction and stock checks are in place, but this case should be tested before saying the concurrency requirement is fully verified.

I would also add automated tests for allowed and blocked status changes. ERP retries are currently handled in the API flow with a limited number of attempts. A background worker with saved retry times would be more reliable and would avoid keeping an API request waiting.

The app also returns the original order if an idempotency key is reused, but it does not fully check whether the new request body matches the original request. Manager endpoints do not have real role-based access checks because login and authorization are not implemented. The UI could also use better loading and error messages and a confirmation before cancellation.

## 4. Known limitations

The order list shows orders from all sample distributors, so it is only suitable for a demo and should not be used as a privacy boundary. The actor value comes from the client and should not be trusted in a real system. Money is stored as a floating-point number for simplicity; a production app should use integer minor units or a decimal type. The demo seed data is only sample data and does not represent a full real-world audit history.

## 5. AI tools

I used ChatGPT while working on this project to understand the assessment, plan the folder structure, draft parts of the frontend and backend, and explain rules such as stock reservation, credit checks, order status changes, and loyalty points. I also used it to understand the error I got when installing `better-sqlite3` on Windows. The log showed that there was no prebuilt binary for my Node.js version and that the build process could not find a working Python installation.

I did not treat every answer as automatically correct. I reviewed the code and checked the project behaviour against the requirements. For example, I checked that stock is checked by the API, not only by the frontend, and reviewed the cancellation and rejection flow to make sure stock should be returned only once.
