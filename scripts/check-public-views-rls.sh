#!/usr/bin/env bash
# Manual regression check for public data exposure.
#
# Usage: bash scripts/check-public-views-rls.sh
# Reads VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from .env
#
# Expectations (anonymous / unauthenticated caller):
#   - businesses_public   -> readable (approved + active rows only)
#   - businesses (base table) -> permission denied for anon (all columns)
#   - reviews (base table) -> only reviews of publicly listed businesses
set -euo pipefail

set -a; source .env; set +a
URL="${VITE_SUPABASE_URL}/rest/v1"
KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}"

fail=0
get() { curl -s "$URL/$1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"; }

expect_denied() {
  local q="$1" body
  body=$(get "$q")
  if grep -q '"code":"42501"' <<<"$body"; then
    echo "PASS  anon denied: $q"
  else
    echo "FAIL  anon was allowed: $q -> ${body:0:200}"; fail=1
  fi
}

expect_ok() {
  local q="$1" body
  body=$(get "$q")
  if grep -q '"code"' <<<"$body"; then
    echo "FAIL  anon blocked: $q -> ${body:0:200}"; fail=1
  else
    echo "PASS  anon can read: $q"
  fi
}

expect_no_field() {
  local q="$1" field="$2" body
  body=$(get "$q")
  if grep -q "\"$field\"" <<<"$body"; then
    echo "FAIL  $field leaked via $q"; fail=1
  else
    echo "PASS  $field not present in $q"
  fi
}

echo "Anonymous (unauthenticated) access checks:"
expect_ok     "businesses_public?select=*&limit=5"
expect_no_field "businesses_public?select=*&limit=5" "phone"
expect_no_field "businesses_public?select=*&limit=5" "email"
expect_no_field "businesses_public?select=*&limit=5" "owner_id"
expect_denied "businesses?select=*&limit=1"
expect_denied "businesses?select=phone,email&limit=1"
expect_denied "businesses?select=owner_id&limit=1"
expect_denied "businesses?select=id,name,city&limit=1"
expect_ok     "reviews_public?select=*&limit=5"

exit $fail
