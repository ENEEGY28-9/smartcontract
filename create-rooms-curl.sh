#!/bin/bash

# Create rooms collection in PocketBase
echo "Creating rooms collection..."

curl -X POST "http://localhost:8090/api/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rooms",
    "type": "base",
    "schema": [
      {
        "name": "name",
        "type": "text",
        "required": true
      },
      {
        "name": "game_mode",
        "type": "select",
        "required": true,
        "options": {
          "values": ["deathmatch", "team_deathmatch", "capture_the_flag", "king_of_the_hill"]
        }
      },
      {
        "name": "max_players",
        "type": "number",
        "required": true
      },
      {
        "name": "player_count",
        "type": "number",
        "required": true
      },
      {
        "name": "spectator_count",
        "type": "number",
        "required": true
      },
      {
        "name": "status",
        "type": "select",
        "required": true,
        "options": {
          "values": ["waiting", "starting", "in_progress", "finished", "closed"]
        }
      },
      {
        "name": "host_player_id",
        "type": "text",
        "required": true
      },
      {
        "name": "created_at",
        "type": "date",
        "required": true
      },
      {
        "name": "updated_at",
        "type": "date",
        "required": true
      },
      {
        "name": "last_activity",
        "type": "date",
        "required": true
      },
      {
        "name": "settings",
        "type": "json"
      },
      {
        "name": "ttl_seconds",
        "type": "number"
      }
    ]
  }'

