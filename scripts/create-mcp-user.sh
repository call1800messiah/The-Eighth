#!/usr/bin/env bash
# =============================================================================
# create-mcp-user.sh — Create the dedicated Supabase user the MCP server acts as
#
# Usage (from the deploy root on the server, after migration 013 is applied):
#   bash scripts/create-mcp-user.sh claude@campaign.example.com
#
# Needs the same root .env as run-migrations.sh (SUPABASE_URL and
# SERVICE_ROLE_KEY). Creates the auth user with a random password, its row in
# `users` (shown as "Claude"), and the `assistant` role — and no other role:
# a GM role would lift every draft restriction.
#
# Prints the three values to put into the Portainer stack's environment.
# The password is shown once and stored nowhere else.
# =============================================================================

set -euo pipefail

EMAIL="${1:-}"
if [ -z "$EMAIL" ]; then
  echo "Usage: bash scripts/create-mcp-user.sh <email for the Claude user>" >&2
  exit 1
fi

if [ ! -f ".env" ]; then
  echo ".env not found (run from the deploy root)." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

SRK="${SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_ROLE_KEY:-}}"
if [ -z "${SUPABASE_URL:-}" ] || [ -z "$SRK" ]; then
  echo "SUPABASE_URL and SERVICE_ROLE_KEY must be set in .env" >&2
  exit 1
fi

PASSWORD="$(head -c 32 /dev/urandom | base64 | tr -d '/+=\n')"
AUTH=(-H "apikey: $SRK" -H "Authorization: Bearer $SRK" -H "Content-Type: application/json")

echo "Creating auth user $EMAIL..."
RESPONSE="$(curl -sS -w '\n%{http_code}' -X POST "$SUPABASE_URL/auth/v1/admin/users" "${AUTH[@]}" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\", \"email_confirm\": true}")"
STATUS="$(echo "$RESPONSE" | tail -1)"
BODY="$(echo "$RESPONSE" | sed '$d')"
if [ "$STATUS" != 200 ] && [ "$STATUS" != 201 ]; then
  echo "Creating the user failed (HTTP $STATUS): $BODY" >&2
  echo "If the address is taken, pick another one or delete that user in Supabase Studio first." >&2
  exit 1
fi
# The user object starts with its own id; identities further down have others.
USER_ID="$(echo "$BODY" | grep -o '"id" *: *"[0-9a-f-]\{36\}"' | head -1 | grep -o '[0-9a-f-]\{36\}')"
if [ -z "$USER_ID" ]; then
  echo "Could not read the new user's id from: $BODY" >&2
  exit 1
fi

rest() {
  local table="$1" body="$2"
  local status
  status="$(curl -sS -o /dev/stderr -w '%{http_code}' -X POST "$SUPABASE_URL/rest/v1/$table" "${AUTH[@]}" \
    -H "Prefer: return=minimal" -d "$body")"
  if [ "$status" != 201 ]; then
    echo "Writing $table failed (HTTP $status)." >&2
    exit 1
  fi
}

echo "Adding the users row and the assistant role..."
rest users "{\"id\": \"$USER_ID\", \"name\": \"Claude\"}"
rest user_roles "{\"user_id\": \"$USER_ID\", \"role\": \"assistant\"}"

cat <<DONE

Done. Set these in the Portainer stack (docker-compose.portainer.yml), together
with MCP_PUBLIC_URL (the app's public https origin) and SUPABASE_ANON_KEY
(ANON_KEY from deploy/supabase/.env), then redeploy the stack:

  MCP_SUPABASE_EMAIL=$EMAIL
  MCP_SUPABASE_PASSWORD=$PASSWORD

DONE
