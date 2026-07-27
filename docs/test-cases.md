# SellerSense — API Test Case Document

**Deliverable:** Test cases for the backend APIs, with the automated test that covers each case and its executed result. All cases are automated (pytest against a dedicated `sellersense_test` PostgreSQL database with real Alembic migrations and pgvector), plus a scripted end-to-end curl smoke test against the live server. Executed results and raw output are in [test-results.md](test-results.md).

**Environment:** PostgreSQL 16 + pgvector (Docker), Python 3.13, FastAPI + httpx ASGI test client, mock AI adapters (deterministic, zero API keys).
**How to run:** `cd backend && pytest` · smoke: `bash scripts/smoke.sh` (server running).

## 1. Health

| ID | Case | Input | Expected | Automated test | Result |
|---|---|---|---|---|---|
| TC-01 | Liveness + DB check | `GET /api/health` | 200, `{status:"ok", database:"up", version}` | `test_health.py::test_health_returns_ok_and_version` | ✅ Pass |

## 2. Authentication

| ID | Case | Input | Expected | Automated test | Result |
|---|---|---|---|---|---|
| TC-02 | Register new user | valid email/name/password | 201, JWT token + `user.tier="free"`, camelCase `createdAt`, no password fields leaked | `test_auth.py::test_register_creates_free_user_with_token` | ✅ Pass |
| TC-03 | Register duplicate email | same email twice | 409, "Email is already registered" | `test_register_duplicate_email_409` | ✅ Pass |
| TC-04 | Register invalid email | `not-an-email` | 422 validation error | `test_register_invalid_email_422` | ✅ Pass |
| TC-05 | Register short password | 5-char password | 422 validation error | `test_register_short_password_422` | ✅ Pass |
| TC-06 | Login success | correct credentials | 200, token + user | `test_login_returns_token` | ✅ Pass |
| TC-07 | Login wrong password | bad password | 401, "Incorrect email or password" | `test_login_wrong_password_401` | ✅ Pass |
| TC-08 | Login unknown email | unregistered email | 401 | `test_login_unknown_email_401` | ✅ Pass |
| TC-09 | Get current user | valid bearer token | 200, `User` object | `test_me_returns_current_user` | ✅ Pass |
| TC-10 | Missing token | no Authorization header | 401, "Not authenticated" | `test_me_without_token_401` | ✅ Pass |
| TC-11 | Invalid token | garbage JWT | 401 | `test_me_with_garbage_token_401` | ✅ Pass |

## 3. CSV Upload & Datasets

| ID | Case | Input | Expected | Automated test | Result |
|---|---|---|---|---|---|
| TC-12 | Upload happy path | 10-row valid CSV + name/productName/source | 201, dataset (`reviewCount:10`) + queued job | `test_ingestion.py::test_upload_happy_path_creates_dataset_and_job` | ✅ Pass |
| TC-13 | Free-tier cap | 51-row CSV, free user | 413 with cap + row count in message | `test_upload_free_tier_cap_413` | ✅ Pass |
| TC-14 | Premium cap 200 | 60 rows OK, 201 rows rejected (premium user) | 201 then 413 | `test_upload_premium_cap_is_200` | ✅ Pass |
| TC-15 | Missing columns | CSV without `rating,text,created_at` | 400, names missing columns | `test_upload_missing_columns_400` | ✅ Pass |
| TC-16 | Invalid row value | rating = 9 | 422, includes row number ("Row 2") | `test_upload_bad_row_422_with_row_number` | ✅ Pass |
| TC-17 | Empty CSV | header only | 400, "no data rows" | `test_upload_empty_csv_400` | ✅ Pass |
| TC-18 | Upload without auth | no token | 401 | `test_upload_requires_auth` | ✅ Pass |
| TC-19 | List + get datasets | after 1 upload | 200; list has the dataset; GET by id returns it | `test_list_and_get_datasets` | ✅ Pass |
| TC-20 | Ownership isolation | user B fetches user A's dataset | 404 | `test_get_dataset_of_other_user_404` | ✅ Pass |
| TC-21 | Seeded sample file | `data/sample_reviews.csv` | 201, `reviewCount:50` | `test_sample_csv_has_50_rows_and_parses` | ✅ Pass |

## 4. AI Pipeline & Jobs

| ID | Case | Input | Expected | Automated test | Result |
|---|---|---|---|---|---|
| TC-22 | Full pipeline e2e | upload 50-row sample, wait for background job | job `done`/100; every review has sentiment + 384-dim embedding + theme; ≥2 theme clusters (≥1 complaint, shares sum to 1); keyword stats persisted; ≥1 alert with email marker | `test_pipeline.py::test_pipeline_end_to_end` | ✅ Pass |
| TC-23 | Job ownership | user B polls user A's job | 404 | `test_job_of_other_user_404` | ✅ Pass |
| TC-24 | Pipeline failure handling | embedding provider raises | job `failed`, error message persisted, server keeps running | `test_pipeline_marks_failed_job` | ✅ Pass |

## 5. Dashboard

| ID | Case | Input | Expected | Automated test | Result |
|---|---|---|---|---|---|
| TC-25 | Frontend contract | analyzed dataset | 200; keys exactly match `frontend/src/lib/types.ts` `DashboardData` (camelCase: `kpis.reviewsAnalyzed`, `themes[].isComplaint`, `reviews[].sentimentScore`, …); trend buckets sum to 100%; distribution sums to 100% | `test_dashboard.py::test_dashboard_matches_frontend_contract` | ✅ Pass |
| TC-26 | Analysis not finished | job still queued | 409, "Analysis is not finished … (status: queued)" | `test_dashboard_before_analysis_409` | ✅ Pass |
| TC-27 | Unknown dataset | random UUID | 404 | `test_dashboard_unknown_dataset_404` | ✅ Pass |

## 6. Premium APIs & Tier Gating

| ID | Case | Input | Expected | Automated test | Result |
|---|---|---|---|---|---|
| TC-28 | Competitors gated | free user | 402, "Premium" in message | `test_premium.py::test_competitors_free_tier_402` | ✅ Pass |
| TC-29 | Alerts gated | free user | 402 | `test_alerts_free_tier_402` | ✅ Pass |
| TC-30 | Reply draft gated | free user | 402 | `test_reply_draft_free_tier_402` | ✅ Pass |
| TC-31 | Competitor comparison | premium user with analyzed dataset + 2 seeded competitors | 200; 2 comparisons; camelCase shape (`sentimentSplit`, `overlapScore`); 6 radar axes; `you.reviewCount = 50` | `test_competitors_premium` | ✅ Pass |
| TC-32 | Competitors, no data | premium user, no analyzed dataset | 200, `[]` | `test_competitors_premium_without_dataset_empty` | ✅ Pass |
| TC-33 | Alerts from rule engine | premium user after pipeline run | 200; ≥1 alert; severity ∈ {warning, serious, critical}; camelCase (`previousShare`, `emailSentTo`, `sampleReviews`) | `test_alerts_premium_returns_pipeline_alerts` | ✅ Pass |
| TC-34 | Reply draft generated | premium user, negative review id | 201; draft persisted; `portal:"amazon"` with deep link; brand-tone body | `test_reply_draft_premium` | ✅ Pass |
| TC-35 | Reply draft unknown review | random UUID | 404 | `test_reply_draft_unknown_review_404` | ✅ Pass |

## 7. End-to-end smoke (live server, `scripts/smoke.sh`)

| ID | Step | Expected | Result |
|---|---|---|---|
| ST-01 | Health | `database:"up"` | ✅ Pass |
| ST-02 | Register → login → `/auth/me` | tokens round-trip, tier `free` | ✅ Pass |
| ST-03 | Upload `sample_reviews.csv` (50 rows) | 201, job queued | ✅ Pass |
| ST-04 | Poll job | `running` → `done` (progress 100) | ✅ Pass |
| ST-05 | Dashboard | KPIs, 100%-sum distribution, "Packaging damage" complaint theme, keywords, 12 trend points, 50 reviews | ✅ Pass |
| ST-06 | Free-tier paywall | `/competitors`, `/alerts` → 402 | ✅ Pass |
| ST-07 | Over-cap upload (60 rows) | 413 with upgrade hint | ✅ Pass |
| ST-08 | Premium login (seeded demo) + upload + poll | tier `premium`, job `done` | ✅ Pass |
| ST-09 | Competitors | 2 comparisons with overlap/advantages/gaps | ✅ Pass |
| ST-10 | Alerts | packaging `critical` + shipping `serious`, `emailSentTo` recorded | ✅ Pass |
| ST-11 | Reply draft | 201, on-brand body + Amazon seller-portal link | ✅ Pass |

**Summary: 35/35 automated tests passed, 11/11 smoke steps passed.** Raw output in [test-results.md](test-results.md).
