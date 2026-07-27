# SellerSense — API Test Results

**Executed:** 2026-07-19 23:12 CDT on macOS (Darwin), PostgreSQL 16 + pgvector via Docker (colima), Python 3.13, mock AI adapters (no API keys).

Companion document: [test-cases.md](test-cases.md) maps every case ID to the test below.

## 1. Automated suite — `pytest -v` (test DB: `sellersense_test`, real migrations)

```
tests/test_auth.py::test_register_creates_free_user_with_token PASSED
tests/test_auth.py::test_register_duplicate_email_409 PASSED
tests/test_auth.py::test_register_invalid_email_422 PASSED
tests/test_auth.py::test_register_short_password_422 PASSED
tests/test_auth.py::test_login_returns_token PASSED
tests/test_auth.py::test_login_wrong_password_401 PASSED
tests/test_auth.py::test_login_unknown_email_401 PASSED
tests/test_auth.py::test_me_returns_current_user PASSED
tests/test_auth.py::test_me_without_token_401 PASSED
tests/test_auth.py::test_me_with_garbage_token_401 PASSED
tests/test_dashboard.py::test_dashboard_matches_frontend_contract PASSED
tests/test_dashboard.py::test_dashboard_before_analysis_409 PASSED
tests/test_dashboard.py::test_dashboard_unknown_dataset_404 PASSED
tests/test_health.py::test_health_returns_ok_and_version PASSED
tests/test_ingestion.py::test_upload_happy_path_creates_dataset_and_job PASSED
tests/test_ingestion.py::test_upload_free_tier_cap_413 PASSED
tests/test_ingestion.py::test_upload_premium_cap_is_200 PASSED
tests/test_ingestion.py::test_upload_missing_columns_400 PASSED
tests/test_ingestion.py::test_upload_bad_row_422_with_row_number PASSED
tests/test_ingestion.py::test_upload_empty_csv_400 PASSED
tests/test_ingestion.py::test_upload_requires_auth PASSED
tests/test_ingestion.py::test_list_and_get_datasets PASSED
tests/test_ingestion.py::test_get_dataset_of_other_user_404 PASSED
tests/test_ingestion.py::test_sample_csv_has_50_rows_and_parses PASSED
tests/test_pipeline.py::test_pipeline_end_to_end PASSED
tests/test_pipeline.py::test_job_of_other_user_404 PASSED
tests/test_pipeline.py::test_pipeline_marks_failed_job PASSED
tests/test_premium.py::test_competitors_free_tier_402 PASSED
tests/test_premium.py::test_alerts_free_tier_402 PASSED
tests/test_premium.py::test_reply_draft_free_tier_402 PASSED
tests/test_premium.py::test_competitors_premium PASSED
tests/test_premium.py::test_competitors_premium_without_dataset_empty PASSED
tests/test_premium.py::test_alerts_premium_returns_pipeline_alerts PASSED
tests/test_premium.py::test_reply_draft_premium PASSED
tests/test_premium.py::test_reply_draft_unknown_review_404 PASSED
======================= 35 passed, 6 warnings in 11.78s ========================
```

## 2. End-to-end smoke — `bash scripts/smoke.sh` (live uvicorn on :8000, dev DB)

```

== 1. Health
{"status":"ok","database":"up","version":"0.1.0"}

== 2. Register free-tier user
{"id":"9054c0e7-6961-4a56-9e4f-f8e8dbbe332b","email":"smoke-1784520580@test.co","name":"Smoke Tester","tier":"free","createdAt":"2026-07-20T04:09:40.323879Z"}

== 3. Login
{"email":"smoke-1784520580@test.co","tier":"free"}

== 4. GET /auth/me
{"id":"9054c0e7-6961-4a56-9e4f-f8e8dbbe332b","email":"smoke-1784520580@test.co","name":"Smoke Tester","tier":"free","createdAt":"2026-07-20T04:09:40.323879Z"}

== 5. Upload sample_reviews.csv (50 rows)
{"dataset":{"id":"85b78f22-5e39-4dac-b7d6-dd89d0b5a544","reviewCount":50},"job":{"id":"b78dc20d-6eec-4499-b4a1-20be1a710006","status":"queued"}}

== 6. Poll job until done
  poll 1: {"status":"running","progress":5}
  poll 2: {"status":"done","progress":100}

== 7. Dashboard (kpis + first theme + first keyword)
{"reviewsAnalyzed":50,"netSentiment":0.15,"positiveRate":0.48,"complaintThemes":2,"avgRating":3.3,"responseOpportunities":21}
{"positive":48,"neutral":10,"negative":42}
{"id":"c295cdc7-a0f7-45fc-8488-83da2d6bb35a","label":"Packaging damage","summary":"Customers frequently mention box, arrived, machine. Recurring complaint driver.","reviewCount":14,"share":0.28,"avgSentiment":-0.4486,"isComplaint":true,"trend":-0.16}
[{"term":"box","count":9,"sentiment":"negative"},{"term":"arrived","count":7,"sentiment":"negative"},{"term":"espresso","count":6,"sentiment":"positive"}]
  trend points: 12, reviews: 50

== 8. Free tier hits the paywall (402 expected)
  GET /competitors -> 402
  GET /alerts -> 402

== 9. Free tier upload over cap (413 expected)
  60-row upload -> 413 (Free tier is limited to 50 reviews per upload; the file contains 60 rows. Upgrade to Premium for up to 200.)

== 10. Premium demo user (seeded): login + upload + premium APIs
{"email":"demo@novabrew.co","tier":"premium"}
  premium job: done

== 11. GET /competitors (premium)
{"competitor":"PocketPress Pro","overlapScore":0.81,"advantages":0,"gaps":4}
{"competitor":"WanderBean Mini","overlapScore":0.8,"advantages":1,"gaps":4}

== 12. GET /alerts (premium)
{"theme":"Slow / opaque shipping","severity":"serious","share":0.16,"emailSentTo":"demo@novabrew.co"}
{"theme":"Packaging damage","severity":"critical","share":0.28,"emailSentTo":"demo@novabrew.co"}

== 13. POST /reviews/{id}/reply-draft (premium)
{"reviewId":"2db09359-eedc-4046-a520-87f92e0f4c23","portal":"amazon","tone":"Warm · Accountable · On-brand","body":"Hi Skye, I'm so sorry your order arrived damaged — that's not the unboxing moment we want ..."}

== SMOKE TEST PASSED
```
