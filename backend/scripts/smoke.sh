#!/usr/bin/env bash
# End-to-end smoke test against a running backend (uvicorn on :8000).
# Prereqs: docker compose up -d && alembic upgrade head && python -m scripts.seed
# Usage:   bash scripts/smoke.sh
set -euo pipefail
BASE=${BASE:-http://localhost:8000/api}
say() { printf "\n== %s\n" "$*"; }

say "1. Health"
curl -sf "$BASE/health" | jq -c .

say "2. Register free-tier user"
EMAIL="smoke-$(date +%s)@test.co"
REG=$(curl -sf -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"name\":\"Smoke Tester\",\"password\":\"S3cure!pass\"}")
echo "$REG" | jq -c '.user'
TOKEN=$(echo "$REG" | jq -r .token)

say "3. Login"
curl -sf -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"S3cure!pass\"}" | jq -c '.user | {email, tier}'

say "4. GET /auth/me"
curl -sf "$BASE/auth/me" -H "Authorization: Bearer $TOKEN" | jq -c .

say "5. Upload sample_reviews.csv (50 rows)"
UP=$(curl -sf -X POST "$BASE/datasets/upload" -H "Authorization: Bearer $TOKEN" \
  -F "file=@data/sample_reviews.csv" \
  -F "name=Amazon — NovaBrew Go Espresso" \
  -F "productName=NovaBrew Go Portable Espresso Maker" \
  -F "source=amazon")
echo "$UP" | jq -c '{dataset: .dataset | {id, reviewCount}, job: .job | {id, status}}'
DATASET_ID=$(echo "$UP" | jq -r .dataset.id)
JOB_ID=$(echo "$UP" | jq -r .job.id)

say "6. Poll job until done"
for i in $(seq 1 30); do
  JOB=$(curl -sf "$BASE/jobs/$JOB_ID" -H "Authorization: Bearer $TOKEN")
  STATUS=$(echo "$JOB" | jq -r .status)
  echo "  poll $i: $(echo "$JOB" | jq -c '{status, progress}')"
  [ "$STATUS" = done ] && break
  [ "$STATUS" = failed ] && { echo "JOB FAILED"; echo "$JOB" | jq .; exit 1; }
  sleep 1
done
[ "$STATUS" = done ] || { echo "job did not finish"; exit 1; }

say "7. Dashboard (kpis + first theme + first keyword)"
DASH=$(curl -sf "$BASE/datasets/$DATASET_ID/dashboard" -H "Authorization: Bearer $TOKEN")
echo "$DASH" | jq -c '.kpis'
echo "$DASH" | jq -c '.distribution'
echo "$DASH" | jq -c '.themes[0]'
echo "$DASH" | jq -c '.keywords[0:3]'
echo "  trend points: $(echo "$DASH" | jq '.trend | length'), reviews: $(echo "$DASH" | jq '.reviews | length')"

say "8. Free tier hits the paywall (402 expected)"
for path in competitors alerts; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$path" -H "Authorization: Bearer $TOKEN")
  echo "  GET /$path -> $CODE"
done

say "9. Free tier upload over cap (413 expected)"
python3 - <<'PY'
lines = ["author,rating,text,created_at"]
lines += [f'B{i},4,"Great crema review {i}",2026-07-01T10:00:00Z' for i in range(60)]
open("/tmp/over_cap.csv", "w").write("\n".join(lines))
PY
CODE=$(curl -s -o /tmp/cap_body.json -w '%{http_code}' -X POST "$BASE/datasets/upload" \
  -H "Authorization: Bearer $TOKEN" -F "file=@/tmp/over_cap.csv" \
  -F "name=Too big" -F "productName=X")
echo "  60-row upload -> $CODE ($(jq -r .detail /tmp/cap_body.json))"

say "10. Premium demo user (seeded): login + upload + premium APIs"
PREM=$(curl -sf -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"demo@novabrew.co","password":"demo1234!"}')
PTOKEN=$(echo "$PREM" | jq -r .token)
echo "$PREM" | jq -c '.user | {email, tier}'
PUP=$(curl -sf -X POST "$BASE/datasets/upload" -H "Authorization: Bearer $PTOKEN" \
  -F "file=@data/sample_reviews.csv" \
  -F "name=Amazon — NovaBrew Go Espresso" \
  -F "productName=NovaBrew Go Portable Espresso Maker" \
  -F "source=amazon")
PJOB=$(echo "$PUP" | jq -r .job.id)
for i in $(seq 1 30); do
  PSTATUS=$(curl -sf "$BASE/jobs/$PJOB" -H "Authorization: Bearer $PTOKEN" | jq -r .status)
  [ "$PSTATUS" = done ] && break
  sleep 1
done
echo "  premium job: $PSTATUS"

say "11. GET /competitors (premium)"
curl -sf "$BASE/competitors" -H "Authorization: Bearer $PTOKEN" \
  | jq -c '.[] | {competitor: .competitor.name, overlapScore, advantages: (.advantages | length), gaps: (.gaps | length)}'

say "12. GET /alerts (premium)"
curl -sf "$BASE/alerts" -H "Authorization: Bearer $PTOKEN" \
  | jq -c '.[] | {theme, severity, share, emailSentTo}'

say "13. POST /reviews/{id}/reply-draft (premium)"
PDATASET=$(echo "$PUP" | jq -r .dataset.id)
NEG_ID=$(curl -sf "$BASE/datasets/$PDATASET/dashboard" -H "Authorization: Bearer $PTOKEN" \
  | jq -r '[.reviews[] | select(.sentimentLabel == "negative")][0].id')
curl -sf -X POST "$BASE/reviews/$NEG_ID/reply-draft" -H "Authorization: Bearer $PTOKEN" \
  | jq -c '{reviewId, portal, tone, body: (.body[0:90] + "...")}'

say "SMOKE TEST PASSED"
