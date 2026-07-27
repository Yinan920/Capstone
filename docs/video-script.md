# SellerSense — 5–7 Minute Video Script & Walkthrough

**Format:** demonstration → code walkthrough → issues & resolutions → close.
**Before you record:** run `cd frontend && npm run dev`, open `http://localhost:5173`, and set
your screen to a clean, high-contrast setup. Times are guides; total ≈ 6:15.

> Narration is written in English to match the product UI. If you prefer to present in
> another language, use these lines as a translation base and keep the on-screen actions.

---

## 0:00 – 0:40 — Intro & the problem (talking head or slide)

> "Hi, I'm [name]. This is **SellerSense** — an AI feedback-intelligence platform for
> e-commerce sellers. The problem: a small seller listing across Amazon, Shopify, and TikTok
> Shop gets hundreds of reviews a month, scattered and impossible to read manually. They miss
> quality issues until the rating drops, can't benchmark against competitors, and respond to
> bad reviews too slowly. SellerSense turns all that feedback into a prioritized action plan."

---

## 0:40 – 2:35 — Live demo (screen share)

**Landing page (`/`)** — *scroll slowly top to bottom.*
> "The marketing site frames the value and the Freemium model — free to start, premium to
> scale. Notice the feature set: dual-track ingestion, an AI dashboard, competitor
> benchmarking, smart alerts, and reply drafting."
*Click **Open dashboard**.*

**Insights dashboard (`/app`)**
> "Here's the core. We analyzed 184 reviews for a portable-espresso seller. Net sentiment is
> +50% but trending down. The **sentiment-over-time** chart shows why — negativity climbs
> around June. The **complaint-themes** chart ranks issues by share of reviews; anything past
> the dashed 15% line is alert-worthy — packaging damage is at 18%. I can read the actual
> reviews behind every metric in the **drill-through** on the right."
*Filter the drill-through to Negative; switch the channel selector (top bar) to TikTok Shop to
show the data change.*

**Free ⇄ Premium toggle** *(top-right)* — *click **Free**.*
> "This is the feature gating. On the free plan, premium panels are locked behind an upgrade
> prompt." *Click **Premium** to unlock again.*

**Competitors (`/app/competitors`)**
> "Competitor benchmarking overlays our sentiment against a rival. The radar shows where the
> profiles overlap and where we differ; the bars compare positive-sentiment share per theme.
> We win on coffee quality and support, but we're exposed on packaging — which is exactly our
> internal complaint. Switch the competitor toggle to compare against a second rival."
*Click **PocketPress Pro**.*

**Alerts (`/app/alerts`)**
> "Smart alerts run automatically after each analysis. Packaging damage is Critical — 18%,
> over threshold, and an email was sent. Let me simulate a new one." *Click **Simulate a new
> alert*** — *a new card animates in.*

**Reply Studio (`/app/reply`)**
> "Finally, reply drafting. Pick a 1-star review; the AI writes an on-brand, accountable
> response. **One click copies it**" *(click **Copy reply** — it flips to "Copied!")* "and
> these deep links jump straight to the Amazon, Shopify, or TikTok seller inbox to paste it."

---

## 2:35 – 4:30 — Code walkthrough (IDE)

> "Let me show how it's built to be production-ready and backend-ready."

**1. Backend-compatibility seam** — open `src/lib/api.ts`.
> "Every screen gets data through this typed API layer. Today each function returns mock data;
> flip `VITE_USE_MOCKS` to false and the same functions call a real FastAPI backend — no
> component changes. That's the key architectural decision: the mock is a stand-in, not a
> throwaway."

**2. Shared types** — open `src/lib/types.ts`.
> "These TypeScript interfaces mirror the planned backend Pydantic models — User, Dataset,
> Review, ThemeCluster, Alert, Competitor, ReplyDraft — so the contract is identical on both
> sides."

**3. Design system & charts** — open `src/lib/chartColors.ts` and a chart, e.g.
`src/components/charts/SentimentTrendChart.tsx`.
> "Brand colors are used only for UI chrome. Chart colors come from a **validated,
> colorblind-safe palette** — I ran a contrast/CVD validator before choosing them. Charts are
> reusable components built on Recharts."

**4. Feature gating** — open `src/components/ui/PremiumGate.tsx` and `src/store/appStore.ts`.
> "Gating is a single wrapper component driven by the tier in app state. On free, it blurs the
> real panel behind an upgrade card — the same component the real auth system will drive later."

---

## 4:30 – 5:45 — Issues encountered & how I resolved them

> "Three real issues came up."

**Issue 1 — Charts rendered blank in automated screenshots.**
> "When I verified the build with headless-browser screenshots, the chart *axes* rendered but
> the *data* — areas, bars, radar — were invisible. Root cause: Recharts animates marks from
> zero on mount using requestAnimationFrame, which doesn't advance the same way under headless
> capture, so marks stayed at zero. Fix: I disabled mount animation on every chart mark
> (`isAnimationActive={false}`). Bonus — it also removes a flash for real users and makes the
> charts screen-recording-friendly."

**Issue 2 — TypeScript/Vite build configuration errors.**
> "The initial build failed: the Vite config imported a Node module the type-checker couldn't
> resolve, and a referenced tsconfig 'couldn't disable emit'. I fixed it by adding Node type
> definitions and consolidating to a single, clean tsconfig — build and type-check now pass."

**Issue 3 — Making data-viz trustworthy, not just pretty.**
> "It's easy to pick chart colors that look nice but fail for colorblind viewers. I used a
> palette validator to confirm the sentiment and competitor colors are distinguishable, and
> kept chart chrome recessive so the data leads. A small discipline that makes the insight
> credible."

---

## 5:45 – 6:15 — Roadmap & close

> "This is Iteration 0 — a polished, backend-compatible front end. Iteration 1 adds the real
> FastAPI backend: PostgreSQL with pgvector for embeddings, JWT auth, the async AI pipeline,
> and live integrations for scraping, Stripe, and email. Because the frontend already speaks
> the final data contract, that's an additive step, not a rewrite. Thanks for watching."

---

### Recording checklist
- [ ] Dev server running; app pre-loaded on the landing page
- [ ] Browser zoom ~100–110%; hide bookmarks bar and notifications
- [ ] Practice the Free/Premium toggle and the "Simulate alert" beat
- [ ] Have `api.ts`, `types.ts`, a chart file, and `PremiumGate.tsx` open in tabs
- [ ] Keep total under 7:00; the demo (section 2) is the part to rehearse most
