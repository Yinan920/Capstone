# SellerSense — Backend API Specification

**Deliverable:** Finalized list of backend APIs with expected input and output (sample JSON included) for the SellerSense capstone application.

**Base URL:** `http://localhost:8000/api`
**Format:** JSON everywhere except the CSV upload (multipart/form-data). All response bodies use **camelCase** keys and mirror the frontend TypeScript contract in `frontend/src/lib/types.ts` exactly, so the existing UI works unchanged when `VITE_USE_MOCKS=false`.

## Conventions

### Authentication
JWT bearer tokens. `POST /auth/register` and `POST /auth/login` return a token; every other endpoint (except `/health`) requires:

```
Authorization: Bearer <token>
```

### Tier gating
`User.tier` is `free` or `premium`.

| Rule | free | premium |
|---|---|---|
| Max reviews per CSV upload | 50 | 200 |
| `/competitors`, `/alerts`, `/reviews/{id}/reply-draft` | **402 Payment Required** | allowed |

### Uniform error shape
All errors return:

```json
{ "detail": "Human-readable message" }
```

| Status | Meaning |
|---|---|
| 400 | Malformed input (e.g. unreadable CSV) |
| 401 | Missing/invalid/expired token, or bad credentials |
| 402 | Premium feature requested by a free-tier user |
| 404 | Resource not found or not owned by the caller |
| 409 | Email already registered |
| 413 | CSV row count exceeds the caller's tier cap |
| 422 | Validation error (FastAPI/Pydantic detail format) |

---

## 1. `GET /api/health`

Liveness probe; also verifies database connectivity. No auth.

**Input:** none.

**Output — 200:**
```json
{ "status": "ok", "database": "up", "version": "0.1.0" }
```

---

## 2. `POST /api/auth/register`

Create an account. New users start on the `free` tier. Returns a JWT so the client is logged in immediately.

**Input:**
```json
{
  "email": "demo@novabrew.co",
  "name": "Yinan He",
  "password": "S3cure!pass"
}
```

**Output — 201:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMDAxIn0.abc123",
  "user": {
    "id": "0b1f4d6e-9c1a-4f7b-8a2e-3d5c6e7f8a90",
    "email": "demo@novabrew.co",
    "name": "Yinan He",
    "tier": "free",
    "createdAt": "2026-07-19T09:00:00Z"
  }
}
```

**Errors:**
- 409 — `{ "detail": "Email is already registered" }`
- 422 — invalid email format / password shorter than 8 chars (Pydantic detail array)

---

## 3. `POST /api/auth/login`

Exchange credentials for a JWT.

**Input:**
```json
{ "email": "demo@novabrew.co", "password": "S3cure!pass" }
```

**Output — 200:** same shape as register:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMDAxIn0.abc123",
  "user": {
    "id": "0b1f4d6e-9c1a-4f7b-8a2e-3d5c6e7f8a90",
    "email": "demo@novabrew.co",
    "name": "Yinan He",
    "tier": "premium",
    "createdAt": "2026-01-14T09:00:00Z"
  }
}
```

**Errors:**
- 401 — `{ "detail": "Incorrect email or password" }`

---

## 4. `GET /api/auth/me`

Return the authenticated user (the frontend calls this on app load to hydrate tier/identity).

**Input:** bearer token only.

**Output — 200:**
```json
{
  "id": "0b1f4d6e-9c1a-4f7b-8a2e-3d5c6e7f8a90",
  "email": "demo@novabrew.co",
  "name": "Yinan He",
  "tier": "premium",
  "createdAt": "2026-01-14T09:00:00Z"
}
```

**Errors:** 401 — `{ "detail": "Not authenticated" }`

---

## 5. `GET /api/datasets`

List the caller's datasets, newest first.

**Input:** bearer token only.

**Output — 200:**
```json
[
  {
    "id": "7f2c9a4b-1d3e-4c5f-9a8b-0e1f2a3b4c5d",
    "name": "Amazon — NovaBrew Go Espresso",
    "source": "amazon",
    "productName": "NovaBrew Go Portable Espresso Maker",
    "reviewCount": 50,
    "createdAt": "2026-07-06T12:00:00Z"
  },
  {
    "id": "8a3d0b5c-2e4f-4d60-ab9c-1f203b4c5d6e",
    "name": "Shopify — NovaBrew Store",
    "source": "shopify",
    "productName": "NovaBrew Go Portable Espresso Maker",
    "reviewCount": 42,
    "createdAt": "2026-07-05T12:00:00Z"
  }
]
```

---

## 6. `POST /api/datasets/upload`

Upload a CSV of reviews. Creates a `Dataset`, stores raw reviews, and queues an async `AnalysisJob` (AI pipeline: sentiment → embeddings → theme clustering → keywords → alert rules). The client then polls `GET /jobs/{id}`.

**Input:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | file (.csv) | yes | Header row required: `author,rating,text,created_at` (`created_at` ISO-8601; `rating` 1–5) |
| `name` | string | yes | Dataset display name |
| `productName` | string | yes | Product the reviews are about |
| `source` | string | no | `amazon` \| `shopify` \| `tiktok` \| `csv` (default `csv`) |

Sample CSV content:
```csv
author,rating,text,created_at
Marcus T.,2,"Great machine but it arrived with the box crushed and the gauge cracked.",2026-07-05T14:20:00Z
Dan W.,5,"Best travel espresso I have owned. Rich crema and the battery lasts all week.",2026-07-03T19:00:00Z
```

**Output — 201:**
```json
{
  "dataset": {
    "id": "7f2c9a4b-1d3e-4c5f-9a8b-0e1f2a3b4c5d",
    "name": "Amazon — NovaBrew Go Espresso",
    "source": "amazon",
    "productName": "NovaBrew Go Portable Espresso Maker",
    "reviewCount": 50,
    "createdAt": "2026-07-19T10:15:00Z"
  },
  "job": {
    "id": "c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f",
    "datasetId": "7f2c9a4b-1d3e-4c5f-9a8b-0e1f2a3b4c5d",
    "status": "queued",
    "progress": 0,
    "error": null,
    "createdAt": "2026-07-19T10:15:00Z"
  }
}
```

**Errors:**
- 400 — `{ "detail": "CSV is missing required columns: rating, text" }`
- 413 — `{ "detail": "Free tier is limited to 50 reviews per upload; the file contains 74 rows. Upgrade to Premium for up to 200." }`
- 422 — row-level validation (e.g. rating 7, empty text) reported with row numbers

---

## 7. `GET /api/datasets/{datasetId}`

Fetch one dataset (must belong to the caller).

**Output — 200:** single `Dataset` object (same shape as list item in #5).

**Errors:** 404 — `{ "detail": "Dataset not found" }`

---

## 8. `GET /api/jobs/{jobId}`

Poll analysis progress. `progress` is 0–100; status transitions `queued → running → done | failed`.

**Output — 200 (running):**
```json
{
  "id": "c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f",
  "datasetId": "7f2c9a4b-1d3e-4c5f-9a8b-0e1f2a3b4c5d",
  "status": "running",
  "progress": 55,
  "error": null,
  "createdAt": "2026-07-19T10:15:00Z"
}
```

**Output — 200 (failed):**
```json
{
  "id": "c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f",
  "datasetId": "7f2c9a4b-1d3e-4c5f-9a8b-0e1f2a3b4c5d",
  "status": "failed",
  "progress": 30,
  "error": "Embedding provider unavailable",
  "createdAt": "2026-07-19T10:15:00Z"
}
```

**Errors:** 404 — `{ "detail": "Job not found" }`

---

## 9. `GET /api/datasets/{datasetId}/dashboard`

Everything the insights dashboard renders for one dataset, aggregated from the analyzed reviews. Shape is identical to the frontend `DashboardData` type. Only valid once the dataset's analysis job is `done` (409 otherwise).

**Output — 200 (abridged arrays for readability — real response contains all items):**
```json
{
  "dataset": {
    "id": "7f2c9a4b-1d3e-4c5f-9a8b-0e1f2a3b4c5d",
    "name": "Amazon — NovaBrew Go Espresso",
    "source": "amazon",
    "productName": "NovaBrew Go Portable Espresso Maker",
    "reviewCount": 50,
    "takeaway": "Address packaging damage immediately \u2014 it is your worst complaint at -0.63 sentiment affecting 10% of reviews and growing (+2%).",
    "createdAt": "2026-07-06T12:00:00Z"
  },
  "kpis": {
    "reviewsAnalyzed": 50,
    "netSentiment": 0.5,
    "positiveRate": 0.66,
    "complaintThemes": 3,
    "avgRating": 4.1,
    "responseOpportunities": 8,
    "netSentimentDelta": -4
  },
  "trend": [
    { "date": "2026-06-22", "positive": 61, "neutral": 20, "negative": 19, "score": 0.42 },
    { "date": "2026-06-29", "positive": 64, "neutral": 19, "negative": 17, "score": 0.47 },
    { "date": "2026-07-06", "positive": 66, "neutral": 18, "negative": 16, "score": 0.5 }
  ],
  "distribution": { "positive": 66, "neutral": 18, "negative": 16 },
  "themes": [
    {
      "id": "d1e2f3a4-b5c6-4d7e-8f90-a1b2c3d4e5f6",
      "label": "Packaging damage",
      "summary": "Units arriving with crushed boxes, cracked gauges, or torn sleeves. Spiking over the last 3 weeks.",
      "reviewCount": 9,
      "share": 0.18,
      "avgSentiment": -0.64,
      "isComplaint": true,
      "trend": 0.07
    },
    {
      "id": "e2f3a4b5-c6d7-4e8f-90a1-b2c3d4e5f607",
      "label": "Coffee quality (loved)",
      "summary": "Consistent praise for crema, taste, compact build and easy cleanup.",
      "reviewCount": 26,
      "share": 0.52,
      "avgSentiment": 0.74,
      "isComplaint": false,
      "trend": -0.02
    }
  ],
  "keywords": [
    { "term": "crushed box", "count": 7, "sentiment": "negative" },
    { "term": "great crema", "count": 11, "sentiment": "positive" },
    { "term": "slow shipping", "count": 4, "sentiment": "negative" }
  ],
  "reviews": [
    {
      "id": "f3a4b5c6-d7e8-4f90-a1b2-c3d4e5f60718",
      "datasetId": "7f2c9a4b-1d3e-4c5f-9a8b-0e1f2a3b4c5d",
      "author": "Marcus T.",
      "rating": 2,
      "text": "Great machine but it arrived with the box crushed and the pressure gauge cracked.",
      "createdAt": "2026-07-05T14:20:00Z",
      "sentimentScore": -0.72,
      "sentimentLabel": "negative",
      "themeId": "d1e2f3a4-b5c6-4d7e-8f90-a1b2c3d4e5f6"
    }
  ]
}
```

Field notes:
- `trend` — weekly buckets; `positive/neutral/negative` are percentages (0–100), `score` = (positive − negative) / 100.
- `distribution` — percentage split over all analyzed reviews.
- `kpis.responseOpportunities` — count of negative reviews (candidates for the reply studio).
- `kpis.netSentimentDelta` — change in net sentiment between the first and last weekly bucket, in percentage points. `null` when the dataset spans fewer than two weeks, in which case the UI hides the indicator rather than showing a zero.
- `dataset.takeaway` — one actionable sentence generated from this dataset's own themes at the end of analysis. `null` for datasets analyzed before the field existed, or when the summarizing call failed (it is deliberately non-fatal; see below).
- `themes[].share` — fraction (0–1) of reviews in the cluster; `trend` = share change vs the previous half of the window.

**Errors:**
- 404 — `{ "detail": "Dataset not found" }`
- 409 — `{ "detail": "Analysis is not finished for this dataset (status: running)" }`

---

## 9b. `GET /api/datasets/{datasetId}/duplicates`

Groups of reviews with near-identical wording — a templated-review signal. Found by cosine distance over the stored pgvector embeddings, because templated reviews are reworded rather than copied: exact matching and hashing find nothing, while cosine distance stays small.

Served separately from the dashboard because the search is quadratic in the dataset while the dashboard is a set of aggregates — the page that loads on every visit should not pay for it. Available on any analyzed dataset the caller owns; an integrity check is not a paid upsell.

**Output — 200:**
```json
[
  {
    "size": 3,
    "maxSimilarity": 0.94,
    "reviews": [
      {
        "id": "0c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f",
        "author": "Jenna R.",
        "rating": 5,
        "text": "Absolutely love this product, shipping was fast and the quality is amazing.",
        "createdAt": "2026-07-02T09:14:00Z"
      }
    ]
  }
]
```

Groups are connected components at a cosine distance of 0.15 (~0.85 similarity), so A~B and B~C yield one group of three — a reused template drifts as it is edited. A clean dataset returns `[]`. The threshold is deliberately conservative: a false positive accuses a real customer of writing a fake review.

**No ANN index is built.** `<=>` runs an exact scan and a dataset holds at most 200 rows, where an ivfflat or HNSW index would add build and maintenance cost to return the same answer more slowly.

**Errors:** 404 — dataset not found or not the caller's.

---

## 10. `GET /api/competitors` — premium

**Query parameters:** `datasetId` *(optional)* — which of the caller's datasets is benchmarked as "you". Omitted, the newest analyzed dataset is used. An id that is unknown, malformed, or belongs to another user returns `[]` rather than silently benchmarking a different dataset. The frontend always sends it, so the page follows the dataset switcher.

Competitor benchmarking board. Compares the caller's primary dataset stats against seeded competitor profiles; radar axes and sentiment splits are computed server-side.

**Output — 200:**
```json
[
  {
    "you": { "name": "NovaBrew Go", "netSentiment": 0.5, "avgRating": 4.1, "reviewCount": 50 },
    "competitor": {
      "id": "a5b6c7d8-e9f0-4a1b-8c2d-3e4f5a6b7c8d",
      "name": "WanderBean Mini",
      "channel": "amazon",
      "reviewCount": 236,
      "netSentiment": 0.41,
      "avgRating": 3.9
    },
    "axes": [
      { "axis": "Coffee quality", "you": 88, "competitor": 72 },
      { "axis": "Packaging", "you": 54, "competitor": 78 },
      { "axis": "Shipping", "you": 61, "competitor": 66 },
      { "axis": "Battery life", "you": 63, "competitor": 58 },
      { "axis": "Support", "you": 82, "competitor": 55 },
      { "axis": "Value", "you": 70, "competitor": 74 }
    ],
    "sentimentSplit": [
      { "label": "Coffee quality", "youPositive": 88, "competitorPositive": 72 },
      { "label": "Packaging", "youPositive": 54, "competitorPositive": 78 }
    ],
    "overlapScore": 0.68,
    "advantages": [
      "Coffee quality praised 16 pts higher than WanderBean",
      "Support responsiveness is your standout moat (+27 pts)"
    ],
    "gaps": [
      "Packaging complaints 24 pts worse than competitor",
      "Shipping speed trails by 5 pts"
    ]
  }
]
```

**Errors:**
- 402 — `{ "detail": "Competitor benchmarking is a Premium feature. Upgrade to unlock." }`
- 401 — not authenticated

---

## 11. `GET /api/alerts` — premium

Smart feedback alerts produced by the rule engine that runs at the end of every analysis job: when a complaint theme's share of the dataset exceeds its threshold (default 15%), an alert is persisted. **Alerts are delivered in-app** — the row *is* the notification, and it arrives unread (`readAt: null`). Nothing is pushed outside the application.

**Output — 200:**
```json
[
  {
    "id": "b6c7d8e9-f0a1-4b2c-9d3e-4f5a6b7c8d9e",
    "datasetId": "7f2c9a4b-1d3e-4c5f-9a8b-0e1f2a3b4c5d",
    "theme": "Packaging damaged",
    "severity": "critical",
    "share": 0.18,
    "threshold": 0.15,
    "previousShare": 0.09,
    "sampleReviews": [
      "Arrived with the box crushed and the pressure gauge cracked.",
      "Packaging was flimsy, unit was dented on arrival."
    ],
    "readAt": null,
    "triggeredAt": "2026-07-19T10:16:02Z"
  }
]
```

Severity rule: `share ≥ threshold + 0.05` → `critical`; `share ≥ threshold` → `serious`; within 0.02 below threshold → `warning`.

The feed spans **all** of the caller's datasets and is not filtered server-side: a seller's alert count is bounded by datasets × complaint themes — tens, not thousands — so returning it whole lets the sidebar count every unread while the Alerts page narrows to the selected dataset by `datasetId`, from one cached response. A `datasetId` query parameter is the change if that bound stops holding.

`previousShare` is the theme's share across the **earlier half of the same upload**, not a reading from a previous time window.

**Errors:** 402 — `{ "detail": "Smart alerts are a Premium feature. Upgrade to unlock." }`

---

## 12. `PATCH /api/alerts/{alertId}/read` — premium

Mark one alert read. **Idempotent** — re-reading an already-read alert keeps the original `readAt` rather than restamping it. Returns the updated alert in the same shape as endpoint 11.

**Errors:** 402 — not premium. 404 — no such alert, or it belongs to another user (ownership failures are 404, never 403, so the endpoint does not confirm that someone else's alert id exists).

---

## 13. `POST /api/alerts/read-all` — premium

**Query parameters:** `datasetId` *(optional)* — scope the action to one upload. The UI passes it for the button shown beside a single dataset's alerts, so the blast radius matches what is on screen; clearing every upload is a separate, explicitly labelled action. An unparseable id matches nothing rather than falling through to "all".

Marks unread alerts read in one round trip, and returns the caller's full alert list in its new state. Alerts already read are left untouched.

**Errors:** 402 — `{ "detail": "Smart alerts are a Premium feature. Upgrade to unlock." }`

---

## 14. `POST /api/reviews/{reviewId}/reply-draft` — premium

Generate (via LLM adapter — mock by default, Claude when a key is configured) and persist a brand-tone reply draft for a review, with a deep link to the matching seller portal.

**Input:** bearer token; empty body (the review id in the path is sufficient).

**Output — 201:**
```json
{
  "id": "c7d8e9f0-a1b2-4c3d-ae4f-5a6b7c8d9e0f",
  "reviewId": "f3a4b5c6-d7e8-4f90-a1b2-c3d4e5f60718",
  "tone": "Warm · Accountable · On-brand",
  "body": "Hi Marcus, I'm so sorry your NovaBrew Go arrived damaged — that's not the unboxing moment we want for you. I've flagged this batch with our fulfillment team and we're upgrading to reinforced packaging this week. I'd love to ship a free replacement right away; just reply and it's on its way. — The NovaBrew Team",
  "portal": "amazon",
  "portalUrl": "https://sellercentral.amazon.com/messaging"
}
```

**Errors:**
- 402 — `{ "detail": "Reply drafts are a Premium feature. Upgrade to unlock." }`
- 404 — `{ "detail": "Review not found" }`

---

## 15. `GET /api/billing/plans`

Plan catalogue. Served from the API so pricing and limits have a single source of truth — the caps returned here are the same values the upload endpoint enforces.

**Input:** none (public).

**Output — 200:**
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "priceMonthly": 0,
      "reviewCap": 50,
      "features": [
        "Sentiment analysis on every review",
        "Automatic theme discovery",
        "High-frequency complaint keywords",
        "Review drill-through"
      ],
      "locked": ["Smart alerts", "Competitor benchmarking", "AI reply drafts"]
    },
    {
      "id": "premium",
      "name": "Premium",
      "priceMonthly": 29,
      "reviewCap": 200,
      "features": [
        "Everything in Free, up to 200 reviews per upload",
        "Smart alerts when a complaint theme crosses threshold",
        "Competitor benchmarking across six dimensions",
        "AI reply drafts with seller-portal deep links"
      ],
      "locked": []
    }
  ]
}
```

---

## 16. `POST /api/billing/upgrade`

Activate Premium for the authenticated account. **Payment is deliberately stubbed:** this endpoint performs the tier transition — the part the application owns — and takes no card details. The production design is Stripe Checkout, where the client is redirected to a Stripe-hosted page and Stripe calls a webhook that flips the tier; card data never reaches this server, which keeps the application out of PCI DSS scope. This handler is where that webhook's logic would live.

**Input:** bearer token; empty body.

**Output — 200:** the updated user.
```json
{
  "id": "0513c98f-5a79-45f6-aea3-2a862b59d90c",
  "email": "seller@example.com",
  "name": "Sam Rivera",
  "tier": "premium",
  "createdAt": "2026-08-24T22:05:39.520403Z"
}
```

Premium endpoints (10, 11, 12) answer `200` for the **same** bearer token immediately — no re-authentication.

**Errors:**
- 409 — `{ "detail": "Your account is already on Premium" }`
- 401 — `{ "detail": "Not authenticated" }`

---

## 17. `POST /api/billing/downgrade`

Return to the Free plan. Exists so the tier transition is demonstrable in both directions; in production this is a subscription cancellation.

**Input:** bearer token; empty body.

**Output — 200:** the updated user, with `"tier": "free"`. Premium endpoints return `402` again immediately.

**Errors:**
- 409 — `{ "detail": "Your account is already on Free" }`
- 401 — `{ "detail": "Not authenticated" }`

---

## 18. `DELETE /api/datasets/{datasetId}`

Delete a dataset and everything derived from it. Foreign-key cascades remove the reviews, the analysis job, theme clusters, keyword stats, alerts and reply drafts, so no orphan rows survive.

**Input:** bearer token; dataset id in the path.

**Output — 204:** empty body.

**Errors:**
- 404 — `{ "detail": "Dataset not found" }` — returned both for an unknown id and for a dataset owned by another user, so the response never confirms that an id exists.
- 401 — `{ "detail": "Not authenticated" }`

> The UI makes this two-step on purpose: the first click only arms the action, because deleting discards an analysis that cost real time and real model calls.

---

## API → screen coverage map

| Frontend surface | APIs used |
|---|---|
| App load / auth | 2, 3, 4 |
| Dataset switcher | 5, 7 |
| Upload flow + progress | 6, 8 |
| Insights dashboard | 9 |
| Competitor board (premium) | 10 |
| Smart alerts (premium) | 11 |
| Reply studio (premium) | 12 |
| Plans / upgrade / checkout | 13, 14, 15 |
| Delete dataset (dashboard) | 16 |
| Ops/monitoring | 1 |
