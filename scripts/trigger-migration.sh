#!/bin/bash
# Trigger migration on production
# Usage: ./scripts/trigger-migration.sh <production-url> <session-secret>
# Example: ./scripts/trigger-migration.sh https://pereirao-express.replit.app $SESSION_SECRET

PROD_URL="${1:-http://localhost:5000}"
SECRET="${2:-$SESSION_SECRET}"

if [ -z "$SECRET" ]; then
  echo "Error: SESSION_SECRET required as 2nd argument or env var"
  echo "Usage: ./scripts/trigger-migration.sh <prod-url> <session-secret>"
  exit 1
fi

echo "Running migration on $PROD_URL ..."
curl -s -X POST "$PROD_URL/api/admin/migrate-data" \
  -H "Content-Type: application/json" \
  -H "x-migration-key: $SECRET" | python3 -m json.tool

echo ""
echo "Done!"
