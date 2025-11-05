#!/bin/bash

# 🚀 GameV1 API Documentation Generator
# Tạo OpenAPI/Swagger documentation cho API

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

DOCS_DIR=${1:-"api-docs"}
API_VERSION=${2:-"v1"}

echo -e "${BLUE}${BOLD}📚 Generating GameV1 API Documentation${NC}"
echo "======================================"
echo -e "Output directory: ${YELLOW}$DOCS_DIR${NC}"
echo -e "API version: ${YELLOW}$API_VERSION${NC}"
echo ""

# Create documentation directory
mkdir -p "$DOCS_DIR"

# Generate OpenAPI specification
cat > "$DOCS_DIR/openapi-$API_VERSION.json" << EOF
{
  "openapi": "3.0.3",
  "info": {
    "title": "GameV1 API",
    "description": "Multiplayer 3D Game Server API with WebRTC support",
    "version": "$API_VERSION",
    "contact": {
      "name": "GameV1 Development Team",
      "url": "https://github.com/gamev1"
    },
    "license": {
      "name": "MIT",
      "url": "https://opensource.org/licenses/MIT"
    }
  },
  "servers": [
    {
      "url": "http://localhost:8080",
      "description": "Development server"
    },
    {
      "url": "https://api.gamev1.com",
      "description": "Production server"
    }
  ],
  "security": [
    {
      "BearerAuth": []
    }
  ],
  "paths": {
    "/healthz": {
      "get": {
        "summary": "Health check endpoint",
        "description": "Returns the health status of the server",
        "responses": {
          "200": {
            "description": "Server is healthy",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "string",
                      "example": "healthy"
                    },
                    "timestamp": {
                      "type": "string",
                      "format": "date-time"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/version": {
      "get": {
        "summary": "Get server version",
        "description": "Returns the current version and build information",
        "responses": {
          "200": {
            "description": "Version information",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "version": {
                      "type": "string",
                      "example": "1.0.0"
                    },
                    "build_time": {
                      "type": "string",
                      "example": "2024-01-15T10:30:00Z"
                    },
                    "git_commit": {
                      "type": "string",
                      "example": "abc123def456"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/login": {
      "post": {
        "summary": "User authentication",
        "description": "Authenticate user and return access/refresh tokens",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["email", "password"],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "user@example.com"
                  },
                  "password": {
                    "type": "string",
                    "format": "password",
                    "example": "password123"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Authentication successful",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "access_token": {
                      "type": "string",
                      "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    },
                    "refresh_token": {
                      "type": "string",
                      "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    },
                    "expires_in": {
                      "type": "integer",
                      "example": 3600
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Authentication failed"
          }
        }
      }
    },
    "/auth/refresh": {
      "post": {
        "summary": "Refresh access token",
        "description": "Use refresh token to get new access token",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["refresh_token"],
                "properties": {
                  "refresh_token": {
                    "type": "string",
                    "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Token refreshed successfully"
          },
          "401": {
            "description": "Invalid refresh token"
          }
        }
      }
    },
    "/api/rooms": {
      "post": {
        "summary": "Create a new game room",
        "description": "Create a new game room with specified settings",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "room_name": {
                    "type": "string",
                    "example": "Battle Arena"
                  },
                  "game_mode": {
                    "type": "string",
                    "enum": ["battle_royale", "team_deathmatch", "capture_flag"],
                    "example": "battle_royale"
                  },
                  "max_players": {
                    "type": "integer",
                    "minimum": 2,
                    "maximum": 100,
                    "example": 50
                  },
                  "is_private": {
                    "type": "boolean",
                    "default": false
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Room created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "room_id": {
                      "type": "string",
                      "example": "room_1234567890"
                    },
                    "room_name": {
                      "type": "string",
                      "example": "Battle Arena"
                    },
                    "status": {
                      "type": "string",
                      "example": "waiting"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request parameters"
          },
          "401": {
            "description": "Authentication required"
          }
        }
      },
      "get": {
        "summary": "List available game rooms",
        "description": "Get a list of all available game rooms",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "status",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": ["waiting", "playing", "finished"]
            }
          },
          {
            "name": "game_mode",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": ["battle_royale", "team_deathmatch", "capture_flag"]
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 20
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of game rooms",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "rooms": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "room_id": {
                            "type": "string"
                          },
                          "room_name": {
                            "type": "string"
                          },
                          "game_mode": {
                            "type": "string"
                          },
                          "current_players": {
                            "type": "integer"
                          },
                          "max_players": {
                            "type": "integer"
                          },
                          "status": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "total": {
                      "type": "integer"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Authentication required"
          }
        }
      }
    },
    "/api/rooms/{room_id}/join": {
      "post": {
        "summary": "Join a game room",
        "description": "Join an existing game room as a player",
        "security": [
          {
            "BearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "room_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "player_name": {
                    "type": "string",
                    "example": "Player1"
                  },
                  "player_avatar": {
                    "type": "string",
                    "example": "avatar_url"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successfully joined room",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "player_id": {
                      "type": "string"
                    },
                    "room_id": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string",
                      "example": "joined"
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Room not found"
          },
          "409": {
            "description": "Room is full or game already started"
          },
          "401": {
            "description": "Authentication required"
          }
        }
      }
    },
    "/api/leaderboard": {
      "get": {
        "summary": "Get leaderboard",
        "description": "Retrieve current leaderboard standings",
        "parameters": [
          {
            "name": "game_mode",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": ["battle_royale", "team_deathmatch", "capture_flag"]
            }
          },
          {
            "name": "time_range",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": ["daily", "weekly", "monthly", "all_time"],
              "default": "all_time"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100,
              "default": 10
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Leaderboard data",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "leaderboard": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "player_id": {
                            "type": "string"
                          },
                          "player_name": {
                            "type": "string"
                          },
                          "score": {
                            "type": "number"
                          },
                          "rank": {
                            "type": "integer"
                          },
                          "games_played": {
                            "type": "integer"
                          }
                        }
                      }
                    },
                    "total_entries": {
                      "type": "integer"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/ws": {
      "get": {
        "summary": "WebSocket connection",
        "description": "Establish WebSocket connection for real-time game communication",
        "parameters": [
          {
            "name": "room_id",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "player_id",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "101": {
            "description": "WebSocket connection established"
          },
          "400": {
            "description": "Invalid parameters"
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
    "schemas": {
      "Error": {
        "type": "object",
        "properties": {
          "error": {
            "type": "string"
          },
          "message": {
            "type": "string"
          },
          "code": {
            "type": "integer"
          }
        }
      },
      "Room": {
        "type": "object",
        "properties": {
          "room_id": {
            "type": "string"
          },
          "room_name": {
            "type": "string"
          },
          "game_mode": {
            "type": "string"
          },
          "max_players": {
            "type": "integer"
          },
          "current_players": {
            "type": "integer"
          },
          "status": {
            "type": "string",
            "enum": ["waiting", "playing", "finished"]
          },
          "created_at": {
            "type": "string",
            "format": "date-time"
          }
        }
      }
    }
  }
}
EOF

# Generate Markdown documentation
cat > "$DOCS_DIR/api-docs-$API_VERSION.md" << EOF
# GameV1 API Documentation - $API_VERSION

## Overview

GameV1 is a multiplayer 3D game server with real-time WebRTC communication. This API provides endpoints for authentication, room management, game state synchronization, and leaderboard functionality.

## Authentication

All API endpoints (except health checks) require JWT authentication. Include the access token in the Authorization header:

\`\`\`
Authorization: Bearer <your_access_token>
\`\`\`

## API Versioning

The API supports multiple versions:

### Header-based versioning
\`\`\`
api-version: v1
\`\`\`

### Accept header versioning
\`\`\`
Accept: application/vnd.gamev1.v1+json
\`\`\`

### URL path versioning
\`\`\`
/api/v1/rooms
\`\`\`

## Endpoints

### Health Check
- **GET** \`/healthz\` - Check server health status

### Authentication
- **POST** \`/auth/login\` - User login
- **POST** \`/auth/refresh\` - Refresh access token

### Room Management
- **POST** \`/api/rooms\` - Create new game room
- **GET** \`/api/rooms\` - List available rooms
- **POST** \`/api/rooms/{room_id}/join\` - Join a room

### Game State
- **POST** \`/api/rooms/{room_id}/input\` - Send player input
- **GET** \`/api/rooms/{room_id}/snapshot\` - Get game snapshot

### Leaderboard
- **GET** \`/api/leaderboard\` - Get leaderboard standings
- **POST** \`/api/leaderboard/submit\` - Submit score

### Real-time Communication
- **GET** \`/ws\` - WebSocket connection for real-time updates

## Response Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **404** - Not Found
- **409** - Conflict
- **429** - Too Many Requests
- **500** - Internal Server Error

## Rate Limiting

- **IP-based**: 100 requests per minute
- **User-based**: 1000 requests per hour

## WebSocket Protocol

The WebSocket connection supports the following message types:

### Client → Server
- \`join_room\` - Join a game room
- \`player_input\` - Send player input
- \`ping\` - Keep connection alive

### Server → Client
- \`room_joined\` - Confirmation of room join
- \`game_state\` - Current game state
- \`player_joined\` - New player joined
- \`player_left\` - Player left the room
- \`game_ended\` - Game finished
- \`pong\` - Response to ping

## Examples

### Authentication
\`\`\`bash
curl -X POST http://localhost:8080/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "password123"}'
\`\`\`

### Create Room
\`\`\`bash
curl -X POST http://localhost:8080/api/rooms \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "room_name": "Battle Arena",
    "game_mode": "battle_royale",
    "max_players": 50
  }'
\`\`\`

### Join Room via WebSocket
\`\`\`javascript
const ws = new WebSocket('ws://localhost:8080/ws?room_id=room_123&player_id=player_456');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'join_room',
    room_id: 'room_123',
    player_name: 'Player1'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
\`\`\`

## Error Handling

All errors follow this format:
\`\`\`json
{
  "error": "error_code",
  "message": "Human readable error message",
  "code": 400
}
\`\`\`

## Metrics

The server exposes Prometheus metrics at \`/metrics\` for monitoring.

## Support

For API support and questions:
- GitHub Issues: https://github.com/gamev1/issues
- Documentation: https://docs.gamev1.com
EOF

# Generate Postman collection
cat > "$DOCS_DIR/gamev1-api-$API_VERSION.postman_collection.json" << EOF
{
  "info": {
    "name": "GameV1 API $API_VERSION",
    "description": "Collection for testing GameV1 API endpoints",
    "version": "1.0.0",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{access_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:8080",
      "type": "string"
    },
    {
      "key": "access_token",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "item": [
        {
          "name": "Health Status",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/healthz",
              "host": ["{{baseUrl}}"],
              "path": ["healthz"]
            }
          }
        }
      ]
    },
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    pm.collectionVariables.set('access_token', response.access_token);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            }
          }
        },
        {
          "name": "Refresh Token",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"refresh_token\": \"{{refresh_token}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/refresh",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "refresh"]
            }
          }
        }
      ]
    },
    {
      "name": "Room Management",
      "item": [
        {
          "name": "Create Room",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"room_name\": \"Battle Arena\",\n  \"game_mode\": \"battle_royale\",\n  \"max_players\": 50\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/rooms",
              "host": ["{{baseUrl}}"],
              "path": ["api", "rooms"]
            }
          }
        },
        {
          "name": "List Rooms",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/rooms?status=waiting&game_mode=battle_royale&limit=20",
              "host": ["{{baseUrl}}"],
              "path": ["api", "rooms"],
              "query": [
                {
                  "key": "status",
                  "value": "waiting"
                },
                {
                  "key": "game_mode",
                  "value": "battle_royale"
                },
                {
                  "key": "limit",
                  "value": "20"
                }
              ]
            }
          }
        },
        {
          "name": "Join Room",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"player_name\": \"Player1\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/rooms/room_123/join",
              "host": ["{{baseUrl}}"],
              "path": ["api", "rooms", "room_123", "join"]
            }
          }
        }
      ]
    },
    {
      "name": "Leaderboard",
      "item": [
        {
          "name": "Get Leaderboard",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/leaderboard?game_mode=battle_royale&time_range=weekly&limit=10",
              "host": ["{{baseUrl}}"],
              "path": ["api", "leaderboard"],
              "query": [
                {
                  "key": "game_mode",
                  "value": "battle_royale"
                },
                {
                  "key": "time_range",
                  "value": "weekly"
                },
                {
                  "key": "limit",
                  "value": "10"
                }
              ]
            }
          }
        },
        {
          "name": "Submit Score",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"player_id\": \"player_123\",\n  \"player_name\": \"Player1\",\n  \"score\": 1500,\n  \"game_mode\": \"battle_royale\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/leaderboard/submit",
              "host": ["{{baseUrl}}"],
              "path": ["api", "leaderboard", "submit"]
            }
          }
        }
      ]
    }
  ]
}
EOF

echo -e "${GREEN}✅ API documentation generated successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Generated files:${NC}"
echo "  • $DOCS_DIR/openapi-$API_VERSION.json (OpenAPI specification)"
echo "  • $DOCS_DIR/api-docs-$API_VERSION.md (Markdown documentation)"
echo "  • $DOCS_DIR/gamev1-api-$API_VERSION.postman_collection.json (Postman collection)"
echo ""
echo -e "${YELLOW}🌐 Quick access:${NC}"
echo "  • OpenAPI JSON: file://$(pwd)/$DOCS_DIR/openapi-$API_VERSION.json"
echo "  • Markdown Docs: file://$(pwd)/$DOCS_DIR/api-docs-$API_VERSION.md"
echo "  • Postman Collection: file://$(pwd)/$DOCS_DIR/gamev1-api-$API_VERSION.postman_collection.json"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "  • Import Postman collection for API testing"
echo "  • Use OpenAPI spec with Swagger UI for interactive docs"
echo "  • Share markdown docs with development team"
echo "  • Update documentation when API changes"
