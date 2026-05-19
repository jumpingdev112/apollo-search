# Apollo Company Search

Standalone React app for searching Apollo organizations (same filters as the company search page in email-leads-manager-app). Calls the Apollo API from the browser; no backend required.

## Setup

1. Copy `.env.example` to `.env`
2. Set your Apollo API key:

```env
VITE_APOLLO_API_KEY=your_apollo_api_key
```

Get a key from [Apollo API settings](https://app.apollo.io/#/settings/integrations/api).

3. Install and run:

```bash
npm install
npm run dev
```

App runs at **http://localhost:3010** by default.

## Development vs production

Apollo’s API does not allow browser CORS for direct calls. In **development**, Vite proxies requests through `/apollo-proxy` and adds your API key from `.env` (recommended; enabled by default).

To call Apollo directly from the browser (may fail due to CORS):

```env
VITE_APOLLO_USE_DEV_PROXY=false
```

For **production** builds, either:

- Deploy behind a reverse proxy that forwards to `https://api.apollo.io` with the `x-api-key` header, and set `VITE_APOLLO_API_BASE_URL` to that proxy path, or
- Set `VITE_APOLLO_USE_DEV_PROXY=false` only if your deployment environment allows cross-origin Apollo requests.

**Security note:** Any key in `VITE_*` env vars is bundled into the client. Use a dedicated Apollo key with minimal permissions, and do not commit `.env`.

## Features

- Full Apollo organization search filters (name, domains, employees, HQ locations, revenue, keywords, technologies, funding, jobs, etc.)
- Paginated results table
- **Extract to CSV** with founded-year filter (up to 500 pages)
- **Saved searches** stored in `localStorage` (browser only)

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm run preview` | Preview production build |
