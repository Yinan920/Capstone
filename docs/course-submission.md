# SellerSense — Capstone Course Submission

**Project:** SellerSense — AI-driven customer-feedback intelligence for e-commerce sellers
**Author:** Ava Chen (replace with your name)
**Date:** July 2026

> This document covers the five written deliverables for the assignment:
> 1) Self-evaluation + programming test, 2) the business problem, 3) the value created,
> 4) technology-trend comparison, 5) two candidate capstone problems.
> Sections marked **[YOU FILL IN]** are personal and must be completed by you — I have
> given you a scaffold and talking points, not invented your scores.

---

## 1. Self-evaluation

### 1.1 Rating scale

| Level | Meaning |
|---|---|
| 1 – Novice | Aware of the concept; need step-by-step guidance |
| 2 – Advanced beginner | Can follow examples and adapt small pieces |
| 3 – Competent | Can build features independently with occasional help |
| 4 – Proficient | Design and deliver production-quality work; mentor others |
| 5 – Expert | Set architecture and standards; deep, transferable mastery |

### 1.2 Self-assessment table **[YOU FILL IN your own ratings]**

| Competency | Rating (1–5) | Evidence from this project (edit to reflect your real experience) |
|---|---|---|
| **Programming** | _[ ]_ | Built a modular React + TypeScript SPA: typed API seam, reusable design-system components, state management (Zustand), data fetching (TanStack Query). |
| **Database systems** | _[ ]_ | Designed the relational + vector schema (Users, Datasets, Reviews with pgvector embeddings, AnalysisJob, ThemeCluster); chose PostgreSQL + pgvector to unify business data and semantic search. |
| **User-interface design** | _[ ]_ | Created a distinctive, conversion-oriented design system; applied a validated, colorblind-safe data-visualization palette; responsive layouts and accessible components. |
| **Business analysis** | _[ ]_ | Framed the SMB-seller pain point, defined Free vs Premium value tiers (feature gating), and mapped features to measurable business outcomes. |
| **Project management** | _[ ]_ | Ran an iterative plan (Iteration 0 → 1), got sign-off before building, tracked tasks, and verified each deliverable before hand-off. |

### 1.3 Quick programming test **[YOU FILL IN]**

The course-provided programming test must be taken by you personally. When you record your
score, add a one-line reflection, e.g.:

> *"Scored X/Y. Strongest on control flow and data structures; want to deepen async and SQL
> query optimization — both directly relevant to the SellerSense backend."*

### 1.4 Reflection (suggested paragraph — personalize before submitting)

> Building SellerSense stretched me across the full stack. My strongest area is **front-end
> engineering and UI design** — I could turn an ambiguous brief into a polished, typed,
> component-driven interface. My biggest growth areas are **backend data engineering**
> (async pipelines, vector search tuning) and **applied ML** (sentiment weak-labeling,
> clustering quality). The project also sharpened non-technical skills: scoping an MVP,
> writing a plan and getting approval before coding, and communicating trade-offs — core
> **project-management and business-analysis** muscles I want to keep developing.

---

## 2. The business problem

### 2.1 Problem statement

**Small and mid-sized e-commerce sellers cannot keep up with the volume, fragmentation, and
business impact of their customer reviews.** A seller listing a product across Amazon,
Shopify, and TikTok Shop may receive hundreds of reviews per month, scattered across
platforms with no shared view. Reading them manually is slow and inconsistent, so sellers:

- **miss emerging quality and fulfillment issues** until they have already damaged the rating
  (e.g., a packaging-damage spike that quietly grows from 9% to 18% of reviews);
- **cannot benchmark** their strengths and weaknesses against competing listings;
- **respond slowly or not at all** to negative reviews, losing the chance to recover the
  customer and signal responsiveness to future buyers.

### 2.2 Why a solution is needed

- **Volume and fragmentation.** Feedback lives in per-channel dashboards with different
  formats and no aggregation; there is no single source of truth.
- **Ratings drive revenue.** Star ratings and review recency strongly influence search
  ranking, the Amazon Buy Box, and conversion. A fractional drop in average rating can
  measurably reduce conversion — so undetected issues translate directly into lost sales.
- **SMBs lack time and analytics capacity.** Unlike large brands, small sellers rarely have a
  data analyst; they need insight, not raw data.
- **Speed matters.** Negative themes compound — an unaddressed defect generates more of the
  same complaint. Early detection prevents a small problem from becoming a rating crisis.

*(Note for submission: where you cite conversion/ranking figures, attribute them to a source
you can defend — e.g., platform documentation or a reputable commerce study. The claims above
are framed as directional, not as exact statistics.)*

---

## 3. Value created by solving it

SellerSense converts scattered reviews into a prioritized action plan. Value falls into three
buckets:

| Value type | How SellerSense delivers it | Illustrative outcome |
|---|---|---|
| **Revenue protection** | Smart alerts detect a negative theme crossing a threshold and email the seller immediately | Catch a packaging-damage spike days earlier → prevent further 1-star reviews and rating loss |
| **Revenue growth** | Competitor benchmarking reveals where you win/lose vs rivals; theme insights guide product & listing improvements | Reposition on a genuine strength (e.g., support responsiveness), close a real gap (packaging) |
| **Operational efficiency** | AI theme clustering + one-click, on-brand reply drafts replace hours of manual reading and writing | Turn "read 200 reviews and write replies" from hours into minutes |

**The through-line:** better ratings → better search placement and conversion; faster issue
resolution → higher retention and fewer refunds; less manual effort → the seller spends time
on decisions, not data entry. For a Freemium SaaS, this value also underpins the pricing
model — the free tier proves value on 50 reviews; premium unlocks scale, scraping,
benchmarking, alerts, and reply automation.

---

## 4. Technology-trend comparison (industry: e-commerce / retail analytics SaaS)

Several trends can be harnessed to create value; the table compares them on maturity, cost,
SMB fit, and how SellerSense uses (or could use) each.

| Trend | What it enables | Maturity | Cost / effort | SMB fit | Use in SellerSense |
|---|---|---|---|---|---|
| **Large Language Models (LLMs)** | Summarize reviews, score sentiment, generate on-brand replies | High, fast-moving | Low per-call, pay-as-you-go | Excellent — no ML team needed | Core: Claude for sentiment weak-labeling, theme summaries, reply drafts |
| **Embeddings + vector databases** | Semantic clustering of reviews; "find similar feedback"; RAG | High | Low (pgvector is open-source) | Strong | Core: pgvector stores review embeddings for theme clustering |
| **Retrieval-Augmented Generation (RAG)** | Ground replies/insights in the seller's real review corpus | Medium-high | Low-medium | Strong | Roadmap: cite real reviews when drafting replies/insights |
| **Agentic AI / workflow automation** | Auto-triage, auto-draft, auto-escalate | Emerging | Medium | Growing | Roadmap: an "inbox agent" that drafts and queues replies |
| **Real-time / event-driven analytics** | Threshold alerts the moment data shifts | High | Medium (queue infra) | Medium | Core: rule engine → email alerts (Resend) on analysis completion |
| **API-first / composable ("headless") commerce** | Pull data from any channel via APIs | High | Low-medium | Strong | Core: adapter layer normalizes Amazon/Shopify/TikTok into one model |
| **Classic ML sentiment/NLP (lexicon, fine-tuned models)** | Cheap, deterministic scoring at scale | Mature | Low but needs tuning | Medium | Alternative to LLM scoring for very high volume / cost control |
| **Predictive analytics** | Forecast rating trajectory, churn, returns | Medium | Medium-high (data + modeling) | Weaker for SMB today | Future: "your rating will hit X if packaging isn't fixed" |

**Comparison takeaway:** For an SMB-focused product, the highest-leverage, lowest-barrier
combination today is **LLMs + embeddings/pgvector + API-first ingestion + event-driven
alerting** — exactly SellerSense's core. Heavier bets (agentic automation, predictive
modeling) are compelling but should follow once the core proves value, because they add cost
and complexity that SMBs will only pay for after seeing ROI.

---

## 5. Two candidate capstone problems

Both are viable to implement; **Problem A is the one prototyped here**.

### Problem A — AI customer-feedback intelligence (SellerSense) ✅ *recommended*

- **Problem:** SMB sellers can't synthesize or act on high-volume, multi-channel reviews.
- **Users / stakeholders:** SMB store owners, brand/ops managers, customer-support staff.
- **Data:** CSV review exports; scraped reviews via commerce APIs (Apify/RapidAPI).
- **Solution:** Ingest → sentiment scoring → embeddings + theme clustering → dashboard,
  competitor benchmarking, threshold alerts, and AI reply drafts.
- **Tech:** React/TS, FastAPI, PostgreSQL + pgvector, Claude LLM, Stripe, Resend.
- **Scope for capstone:** Free-tier vertical slice first (built), then premium features.
- **Success metrics:** time-to-insight, alert lead time, reply-turnaround, rating trend,
  free→premium conversion.

### Problem B — AI returns & refund-reduction analyzer

- **Problem:** Returns quietly erode SMB margins; sellers rarely know *why* items come back
  (sizing, defects, "not as described", shipping damage) or which SKUs/listings drive it.
- **Users / stakeholders:** SMB sellers, operations, and listing managers.
- **Data:** Order + return records, return-reason codes, product listings, and review text.
- **Solution:** Classify and cluster return reasons (LLM + embeddings), attribute them to
  SKUs and listing attributes, quantify margin impact, and recommend fixes (listing edits,
  packaging changes, size-guide updates); alert on rising return themes.
- **Tech:** Same stack as A, reused — strong synergy and code reuse with SellerSense.
- **Scope for capstone:** Reason-classification + margin dashboard first; recommendations next.
- **Success metrics:** return-rate reduction, margin recovered, accuracy of reason
  classification, adoption of recommended fixes.

**Why these two:** they share a data model, an AI pipeline, and a stack, so choosing either —
or sequencing B after A — maximizes reuse and reduces capstone risk.

---

## Appendix — What was actually built (for the demo)

A production-shaped, backend-compatible **front-end prototype** of SellerSense: an English,
Shopify-Editions-inspired UI covering the marketing landing page, insights dashboard,
competitor benchmarking board, smart-alerts panel, and reply-draft optimizer — all driven by
a typed mock API layer that swaps to a real FastAPI backend via one config flag, with no
component changes. See `frontend/README.md` for how to run it and `video-script.md` for the
recording walkthrough.
