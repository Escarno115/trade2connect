#!/usr/bin/env bash
# Manual regression check: public views must respect RLS (security_invoker = on).
#
# Usage: bash scripts/check-public-views-rls.sh
# Reads VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from .env
set -euo pipefail

set -a; source .env; set +a
URL="${VITE_SUPABASE_URL}/rest/v1"
KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}"

fail=0
check_empty() {
  local table="$1"
  local body
  body=$(curl -s "$URL/$table?select=*&limit=50" -H "apikey: $KEY" -H "Authorization: Bearer $KEY")
  if [ "$body" = "[]" ]; then
    echo "PASS  anon cannot read rows from $table"
  else
    echo "FAIL  anon read rows from $table: ${body:0:200}"
    fail=1
  fi
}

echo "Anonymous (unauthenticated) access checks:"
check_empty reviews_public
check_empty reviews
check_empty businesses

exit $fail
