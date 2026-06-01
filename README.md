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

The frontend defaults to the production API at `https://sop-app-byccdteeb0evhwhh.canadacentral-01.azurewebsites.net/api/v1/sops/generate`.

The dev server can still proxy `/api` requests to `http://127.0.0.1:8000` if you override the API path back to a relative `/api/...` value.

## Environment

Optional:

- `VITE_SOP_GENERATE_API_PATH` defaults to `https://sop-app-byccdteeb0evhwhh.canadacentral-01.azurewebsites.net/api/v1/sops/generate`
- `VITE_SOP_API_PATH` is also accepted as a compatibility alias for the same single endpoint
