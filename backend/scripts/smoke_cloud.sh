#!/usr/bin/env bash
# Post-deployment smoke test (system validation) against a DEPLOYED SellerSense.
#
# Safe to run against production: every step uses a throwaway account created at
# the start and deletes its own data at the end, so seeded demo content is never
# touched. Exits non-zero on the first failure.
#
# Usage:   bash scripts/smoke_cloud.sh
#          BASE=https://sellersense-yuuwat5zca-uc.a.run.app/api bash scripts/smoke_cloud.sh
# Prereqs: curl, jq, python3, and data/sample_reviews.csv (run from backend/).
set -euo pipefail
BASE=${BASE:-https://sellersense-ai.web.app/api}
PASS=0
say() { printf "\n== %s\n" "$*"; }
ok()  { PASS=$((PASS + 1)); printf "   PASS — %s\n" "$*"; }
die() { printf "   FAIL — %s\n" "$*" >&2; exit 1; }

say "S1. Service + database health"
H=$(curl -sf -m 60 "$BASE/health") || die "health endpoint unreachable"
echo "   $H"
[ "$(echo "$H" | jq -r .status)" = ok ] || die "status is not ok"
[ "$(echo "$H" | jq -r .database)" = up ] || die "database is not up (app is serving, DB is not)"
ok "API up, database reachable, version $(echo "$H" | jq -r .version)"

say "S2. SPA is served on the same origin and deep links survive a refresh"
ROOT=$(curl -s -o /dev/null -w '%{http_code}' -m 60 "${BASE%/api}/")
DEEP=$(curl -s -o /dev/null -w '%{http_code}' -m 60 "${BASE%/api}/app/upload")
echo "   GET / -> $ROOT · GET /app/upload -> $DEEP"
[ "$ROOT" = 200 ] && [ "$DEEP" = 200 ] || die "SPA fallback not serving (expected 200/200)"
ok "SPA fallback returns index.html for deep links"

say "S3. Register a throwaway free account"
EMAIL="smoke-$(date +%s)@example.com"
REG=$(curl -sf -m 60 -X POST "$BASE/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"name\":\"Post-Deploy Smoke\",\"password\":\"S3cure!pass\"}") \
  || die "registration failed"
TOKEN=$(echo "$REG" | jq -r .token)
echo "   $(echo "$REG" | jq -c '.user | {email, tier}')"
[ "$(echo "$REG" | jq -r .user.tier)" = free ] || die "new account should start on the free tier"
ok "account created on the free tier, JWT issued"

say "S4. Upload the 50-row sample and wait for the AI pipeline"
UP=$(curl -sf -m 120 -X POST "$BASE/datasets/upload" -H "Authorization: Bearer $TOKEN" \
  -F "file=@data/sample_reviews.csv" \
  -F "name=Post-deploy smoke" -F "productName=NovaBrew Go Portable Espresso Maker" \
  -F "source=amazon") || die "upload failed"
DATASET_ID=$(echo "$UP" | jq -r .dataset.id)
JOB_ID=$(echo "$UP" | jq -r .job.id)
echo "   $(echo "$UP" | jq -c '{reviewCount: .dataset.reviewCount, job: .job.status}')"
START=$(date +%s)
for _ in $(seq 1 60); do
  JOB=$(curl -sf -m 60 "$BASE/jobs/$JOB_ID" -H "Authorization: Bearer $TOKEN")
  STATUS=$(echo "$JOB" | jq -r .status)
  [ "$STATUS" = done ] && break
  [ "$STATUS" = failed ] && die "pipeline job failed: $(echo "$JOB" | jq -r .error)"
  sleep 2
done
[ "$STATUS" = done ] || die "job still $STATUS after 120s"
ok "pipeline finished in $(($(date +%s) - START))s (50 reviews scored, embedded, clustered)"

say "S5. Dashboard returns analysed data"
DASH=$(curl -sf -m 60 "$BASE/datasets/$DATASET_ID/dashboard" -H "Authorization: Bearer $TOKEN")
echo "   $(echo "$DASH" | jq -c .kpis)"
[ "$(echo "$DASH" | jq '.kpis.reviewsAnalyzed')" = 50 ] || die "expected 50 analysed reviews"
[ "$(echo "$DASH" | jq '.themes | length')" -ge 2 ] || die "expected at least 2 themes"
ok "$(echo "$DASH" | jq -r '.themes | length') themes, $(echo "$DASH" | jq -r '.keywords | length') keywords, $(echo "$DASH" | jq -r '.trend | length') trend points"

say "S6. Free tier is gated (402) and capped (413)"
for path in competitors alerts; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 60 "$BASE/$path" -H "Authorization: Bearer $TOKEN")
  echo "   GET /$path -> $CODE"
  [ "$CODE" = 402 ] || die "expected 402 on /$path for a free account"
done
python3 - <<'PY'
lines = ["author,rating,text,created_at"]
lines += [f'B{i},4,"Great crema review {i}",2026-07-01T10:00:00Z' for i in range(60)]
open("/tmp/smoke_over_cap.csv", "w").write("\n".join(lines))
PY
CODE=$(curl -s -o /tmp/smoke_cap.json -w '%{http_code}' -m 60 -X POST "$BASE/datasets/upload" \
  -H "Authorization: Bearer $TOKEN" -F "file=@/tmp/smoke_over_cap.csv" -F "name=Over cap" -F "productName=X")
echo "   60-row upload -> $CODE ($(jq -r .detail /tmp/smoke_cap.json))"
[ "$CODE" = 413 ] || die "expected 413 over the free cap"
ok "paywall and upload cap enforced server-side"

say "S7. Self-serve upgrade unlocks Premium without re-login"
PLANS=$(curl -sf -m 60 "$BASE/billing/plans")
echo "   plans: $(echo "$PLANS" | jq -c '[.plans[] | {id, priceMonthly, reviewCap}]')"
UPG=$(curl -sf -m 60 -X POST "$BASE/billing/upgrade" -H "Authorization: Bearer $TOKEN") || die "upgrade failed"
[ "$(echo "$UPG" | jq -r .tier)" = premium ] || die "tier did not flip to premium"
for path in competitors alerts; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 60 "$BASE/$path" -H "Authorization: Bearer $TOKEN")
  echo "   GET /$path -> $CODE"
  [ "$CODE" = 200 ] || die "expected 200 on /$path after upgrade (same token)"
done
ok "tier flipped to premium; premium APIs answer 200 with the original token"

say "S8. Premium features answer with real content"
NEG_ID=$(echo "$DASH" | jq -r '[.reviews[] | select(.sentimentLabel == "negative")][0].id')
REPLY=$(curl -sf -m 60 -X POST "$BASE/reviews/$NEG_ID/reply-draft" -H "Authorization: Bearer $TOKEN")
echo "   reply draft: $(echo "$REPLY" | jq -r '.body[0:70]')..."
[ "$(echo "$REPLY" | jq -r '.body | length')" -gt 40 ] || die "reply draft is empty"
ok "AI reply draft generated for a negative review"

say "S9. Downgrade re-locks Premium"
curl -sf -m 60 -X POST "$BASE/billing/downgrade" -H "Authorization: Bearer $TOKEN" > /dev/null
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 60 "$BASE/competitors" -H "Authorization: Bearer $TOKEN")
echo "   GET /competitors after downgrade -> $CODE"
[ "$CODE" = 402 ] || die "expected 402 after downgrade"
ok "gate closes again on downgrade"

say "S10. Clean up: delete the smoke dataset"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 60 -X DELETE "$BASE/datasets/$DATASET_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "   DELETE /datasets/{id} -> $CODE"
[ "$CODE" = 204 ] || die "cleanup delete returned $CODE"
LEFT=$(curl -sf -m 60 "$BASE/datasets" -H "Authorization: Bearer $TOKEN" | jq 'length')
[ "$LEFT" = 0 ] || die "$LEFT datasets left behind"
ok "dataset and all derived rows removed; account left empty"

printf "\n== POST-DEPLOYMENT SMOKE PASSED — %s/10 checks against %s\n" "$PASS" "$BASE"
