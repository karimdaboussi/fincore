# API notes

Base path: `/api/v1`. Swagger UI at `/swagger-ui/index.html` describes the request/response schemas. Obtain a token through `/auth/login` and send `Authorization: Bearer <token>` on protected endpoints.

| Area | Routes |
| --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login` |
| Profile | `GET /customers/me`, `PATCH /customers/me` |
| Account | `GET /accounts/me`, `GET /accounts/me/balance` |
| Transactions | `POST /transactions/withdraw`, `POST /transactions/transfer`, `GET /transactions/me`, `GET /transactions/{id}` |
| Administration | `GET /admin/customers`, `GET /admin/accounts`, `GET /admin/transactions`, `GET /admin/statistics` |
| Applications | `PATCH /admin/customers/{id}/approve`, `PATCH /admin/customers/{id}/reject` |
| Account controls | `PATCH /admin/accounts/{id}/freeze`, `/unfreeze`, `/close` |
| Funding | `POST /admin/accounts/{id}/deposit` |

Use actual database IDs from API responses for resource paths. Transfers use the recipient's account number. An administrator deposit path takes an account ID, not a customer ID.

## Financial retries

Send an `Idempotency-Key` header with deposits, withdrawals, and transfers. Reuse the same key and identical payload when retrying an uncertain result. A successful replay returns the original transaction; reusing the key with different operation details returns 409. Keys are scoped to the authenticated actor. Generate a new key for a new instruction.

A timeout or lost response does not prove that the database rolled back. The frontend retains the instruction and key for an explicit retry. Balance changes and the transaction record commit together.

## Errors and pagination

Errors use HTTP Problem Details with `status`, `title`, and `detail`. Validation failures return 400; authentication failures 401; forbidden actions 403; missing resources 404; conflicting state 409. Protected record lookup also checks ownership.

History accepts zero-based `page` and `size` parameters, plus optional transaction `type`, `from`, and `to` filters. Use ISO-8601 instants for timestamps. Financial amounts are exact decimal values, limited to two fractional digits. Consult Swagger for endpoint-specific fields and constraints.
