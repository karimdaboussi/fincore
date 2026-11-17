# Development

## Native backend

Install Java 21 and PostgreSQL. Create a dedicated `fincore` role and database, with that role owning the database. Flyway applies the schema when the application starts; Hibernate validates it.

Set these environment variables in the terminal that starts Java (PowerShell example):

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/fincore"
$env:DB_USER = "fincore"
$env:DB_PASSWORD = "your-local-database-password"
$env:JWT_SECRET = "your-random-secret-at-least-32-bytes-long"
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "your-strong-admin-password"
.\mvnw.cmd -B verify
java -jar target\fincore-1.0.0.jar --server.port=8081
```

Replace example secrets before use. `.env` is read by Docker Compose, not automatically by a native Java process. Each terminal has its own environment. Administrator bootstrap is optional for native startup; set both administrator variables to create the initial administrator. Restarting with another password does not serve as a password reset for an existing account.

Keep Java running in that terminal. In another terminal, run `npm ci` then `npm run dev` inside `frontend`. `API_TARGET` can override the Vite proxy target when starting Vite. The default is `http://localhost:8081`.

## Tests and formatting

Use `bash ./mvnw -B spotless:check verify` on Unix or `.\mvnw.cmd -B spotless:check verify` on Windows. `spotless:apply` formats Java. Run `npm run format` inside `frontend` to format TypeScript and frontend configuration.

The default integration runner uses Testcontainers with PostgreSQL 17. For a local alternative, create a **disposable, dedicated test database** and set `FINCORE_TEST_DB_URL`, `FINCORE_TEST_DB_USER`, and, if needed, `FINCORE_TEST_DB_PASSWORD` before Maven. The suite deletes application rows; never point it at development or shared data. Both runners use the same integration scenarios.

Playwright downloads Chromium with `npx playwright install chromium`. `FINCORE_BROWSER_PATH` optionally selects an existing Chromium executable. Browser flows mock the HTTP API; the standalone guide checks run offline. Screenshots, traces, build output, and dependency directories are ignored by Git.

## Configuration and packaging

`application.yml` contains environment placeholders. `.env.example` contains placeholders only. Keep `.env`, database credentials, private keys, and tokens out of commits. Build the API with Maven and the frontend with `npm run build`. The backend Dockerfile packages Java only; deploying the frontend requires a static host and a reverse proxy for `/api`.

`build.py` is an optional Windows helper for paths Maven cannot handle (such as a directory ending in a space). It stages backend sources in a temporary directory. Normal checkouts should use the Maven Wrapper.
