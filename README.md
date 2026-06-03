# SOP Generator Frontend

Vite + React single-page frontend for the SOP Generator API.

## Run

1. Start the standalone backend 
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

## Deployment
The deployment is performed automatically whenever a new commit is pushed to the `master` branch.

