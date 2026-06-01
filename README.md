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

The dev server proxies `/api` requests to `http://127.0.0.1:8000`.

## Environment

Optional:

- `VITE_SOP_GENERATE_API_PATH` defaults to `/api/v1/sops/generate`
- `VITE_SOP_API_PATH` is also accepted as a compatibility alias for the same single endpoint
