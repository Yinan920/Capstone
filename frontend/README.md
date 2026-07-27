# SellerSense — Frontend (Iteration 0: Mock Demo)

AI customer-feedback intelligence for e-commerce sellers. This is the **pure-frontend
mock** build: every screen is fully interactive with realistic sample data and **no
backend required**. It is structured to stay compatible with the planned FastAPI
backend, so later iterations only add the data source.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Recharts · React Router · TanStack Query · Zustand

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## What's in the demo

| Route | Screen |
|---|---|
| `/` | Marketing landing page (Free vs Premium pricing) |
| `/app` | Insights dashboard — sentiment trend, distribution, complaint themes, keywords, review drill-through |
| `/app/competitors` | Competitor benchmarking board (radar + grouped bars, competitor toggle) — **Premium** |
| `/app/alerts` | Smart feedback alerts with threshold meters + "simulate alert" — **Premium** |
| `/app/reply` | Reply-draft optimizer with **working one-click copy** + seller-portal deep links — **Premium** |

Use the **Free ⇄ Premium** toggle in the app top bar to demo feature-gating live.

## Backend-compatibility contract

- `src/lib/types.ts` — domain types that mirror the planned backend Pydantic models.
- `src/lib/api.ts` — the single data seam. Every function returns a domain type from
  local mocks today; set `VITE_USE_MOCKS=false` (see `.env.example`) and the same
  functions call the real FastAPI endpoints instead. **No component changes needed.**
- `src/mocks/data.ts` — sample dataset (a portable-espresso seller across channels).

## Design

Shopify-Editions-inspired: bold display type, indigo/violet brand with a lime signal
accent, editorial whitespace. Chart colors use a **validated, colorblind-safe**
palette (verified with the dataviz validator) — brand colors are used for UI chrome
only, never for data marks.
