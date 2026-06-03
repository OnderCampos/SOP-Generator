# SOP Generator Frontend

Vite + React single-page frontend for the SOP Generator API.

## Run

1. Start the standalone backend from [`../APIStandalone`](../APIStandalone).
2. Install dependencies:

```bash
npm install
```

3. Start the frontend:

```bash
npm run dev
```

The frontend selects the backend URL from environment variables using a single `VITE_APP_ENV` toggle.

## Environment

Base variables in `.env`:

- `VITE_API_URL_DEV=/api`
- `VITE_API_URL_PROD=https://sop-app-byccdteeb0evhwhh.canadacentral-01.azurewebsites.net/api/v1/sops/generate`

Toggle files:

- `.env.development` sets `VITE_APP_ENV=development`
- `.env.production` sets `VITE_APP_ENV=production`

The app uses the selected env URL directly as the generate endpoint.

For local development, `VITE_API_URL_DEV=/api/v1/sops/generate` is intentional. The browser calls the Vite dev server on the same origin, and Vite proxies that traffic to `http://127.0.0.1:8000`, which avoids local CORS issues.

## Request Timing

The current frontend submit flow uses the browser `fetch` API without an explicit `AbortController` timeout, so the page waits until the request completes or the browser/network stack closes it.

If users still see `504 Gateway Timeout`, the limit is coming from the backend host or an upstream proxy rather than from this React app.
