#!/usr/bin/env bash
# Open a psql session against the deployed Cloud SQL database.
#
#   bash backend/scripts/db-cloud.sh          # interactive session
#   bash backend/scripts/db-cloud.sh "SQL"    # run one query and exit
#
# Handles the two things that otherwise break mid-demo: it reads the password
# from Secret Manager (so nothing sensitive is typed on camera) and re-authorizes
# your current public IP, which changes whenever you switch networks.
set -euo pipefail

INSTANCE=sellersense-db
PROJECT=sellersense-yinan920
REGION=us-central1
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"

HOST=$(gcloud sql instances describe "$INSTANCE" --project "$PROJECT" \
  --format='value(ipAddresses[0].ipAddress)')
export PGPASSWORD=$(gcloud secrets versions access latest --secret=database-url \
  --project "$PROJECT" | sed -E 's|.*://postgres:([^@]+)@.*|\1|')

# Re-authorize this machine only if it can't already reach the instance.
if ! PGCONNECT_TIMEOUT=6 psql -h "$HOST" -U postgres -d sellersense -c 'SELECT 1' >/dev/null 2>&1; then
  MYIP=$(curl -s ifconfig.me)
  echo "authorizing $MYIP for $INSTANCE (one-time, ~30s)…"
  gcloud sql instances patch "$INSTANCE" --project "$PROJECT" \
    --authorized-networks="$MYIP/32" --quiet >/dev/null
fi

if [ $# -gt 0 ]; then
  exec psql -h "$HOST" -U postgres -d sellersense -c "$1"
else
  echo "connected to Cloud SQL · type \\q to quit"
  exec psql -h "$HOST" -U postgres -d sellersense
fi
