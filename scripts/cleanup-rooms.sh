#!/usr/bin/env bash
# Cleanup stale rooms in PocketBase based on last_activity / ttl_seconds
# Requires: POCKETBASE_URL and POCKETBASE_ADMIN_TOKEN env vars

set -euo pipefail

PB_URL=${POCKETBASE_URL:-http://127.0.0.1:8090}
ADMIN_TOKEN=${POCKETBASE_ADMIN_TOKEN:-}

if [ -z "$ADMIN_TOKEN" ]; then
  echo "ERROR: POCKETBASE_ADMIN_TOKEN not set"
  exit 1
fi

echo "Listing rooms..."
rooms_json=$(curl -s -H "Authorization: Admin $ADMIN_TOKEN" "$PB_URL/api/collections/rooms/records?page=1&perPage=100&sort=-updated_at")

now_epoch=$(date +%s)

echo "$rooms_json" | jq -c '.items[]' | while read -r item; do
  id=$(echo "$item" | jq -r '.id')
  last_activity=$(echo "$item" | jq -r '.last_activity // empty')
  ttl_seconds=$(echo "$item" | jq -r '.ttl_seconds // empty')

  if [ -z "$last_activity" ]; then
    # if missing, fallback to updated_at
    last_activity=$(echo "$item" | jq -r '.updated_at // empty')
  fi

  if [ -z "$last_activity" ]; then
    echo "Skipping room $id (no last activity)"
    continue
  fi

  last_epoch=$(date -d "$last_activity" +%s)
  age=$((now_epoch - last_epoch))

  if [ -n "$ttl_seconds" ] && [ "$age" -ge "$ttl_seconds" ]; then
    echo "Deleting room $id (age=$age >= ttl=$ttl_seconds)"
    curl -s -X DELETE -H "Authorization: Admin $ADMIN_TOKEN" "$PB_URL/api/collections/rooms/records/$id" >/dev/null || true
  else
    # If no ttl but older than 24h, delete by default
    if [ "$age" -ge $((24*3600)) ]; then
      echo "Deleting room $id (age=$age >= 24h default)"
      curl -s -X DELETE -H "Authorization: Admin $ADMIN_TOKEN" "$PB_URL/api/collections/rooms/records/$id" >/dev/null || true
    else
      echo "Keeping room $id (age=$age)"
    fi
  fi
done

echo "Cleanup done."



