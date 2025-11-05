use axum::{
    extract::State,
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use serde::{Deserialize, Serialize};
use tracing::{warn, info};
use reqwest::Client;
use chrono::{Duration, Utc};

use crate::auth::{AuthService, Claims};
use common_net::database::DatabasePool;

// PocketBase authentication structures
#[derive(Debug, Deserialize)]
struct PocketBaseAuthResponse {
    record: PocketBaseUser,
    token: String,
}

#[derive(Debug, Deserialize, Clone)]
struct PocketBaseUser {
    id: String,
    email: String,
    username: Option<String>,
    verified: bool,
}

// Re-export AppState for use in middleware
// This should match the AppState defined in lib.rs
#[derive(Clone)]
pub struct AppState {
    pub auth_service: AuthService,
    pub database_pool: DatabasePool,
}

// Validate PocketBase token by calling PocketBase API
async fn validate_pocketbase_token(token: &str) -> Result<Claims, Box<dyn std::error::Error + Send + Sync>> {
    let client = Client::new();

    // Call PocketBase to validate token (auth-refresh requires POST)
    let response = client
        .post("http://localhost:8090/api/collections/users/auth-refresh")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err("Invalid PocketBase token".into());
    }

    // Parse response to get user info
    let auth_response: PocketBaseAuthResponse = response.json().await?;

    // Convert PocketBase user to our Claims structure
    let claims = Claims {
        sub: auth_response.record.id,
        username: auth_response.record.username.unwrap_or_else(|| auth_response.record.email.clone()),
        email: auth_response.record.email,
        role: "user".to_string(),
        exp: (Utc::now() + Duration::hours(24)).timestamp(), // 24 hours from now
        iat: Utc::now().timestamp(),
        iss: "pocketbase-gateway".to_string(),
    };

    info!("Validated PocketBase token for user: {}", claims.sub);
    Ok(claims)
}

// Validate PocketBase token by decoding JWT directly (faster, no API call)
fn validate_pocketbase_token_direct(token: &str) -> Result<Claims, Box<dyn std::error::Error + Send + Sync>> {
    use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};

    // PocketBase uses HS256
    let secret = std::env::var("PB_JWT_SECRET").unwrap_or_else(|_| "your-pocketbase-secret".to_string());
    let decoding_key = DecodingKey::from_secret(secret.as_ref());

    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    // PocketBase token structure is different from our Claims
    #[derive(Debug, serde::Deserialize)]
    struct PocketBaseTokenClaims {
        pub id: String,
        pub collectionId: String,
        pub exp: i64,
        pub iat: Option<i64>,
        #[serde(rename = "type")]
        pub token_type: Option<String>, // PocketBase uses "type" field
    }

    let token_data = decode::<PocketBaseTokenClaims>(token, &decoding_key, &validation)?;
    let user_id = token_data.claims.id;

    // Convert PocketBase claims to our Claims structure
    let claims = Claims {
        sub: user_id.clone(),
        username: format!("user_{}", &user_id[..8.min(user_id.len())]), // Temporary username
        email: format!("{}@pocketbase.local", user_id), // Temporary email
        role: "user".to_string(),
        exp: token_data.claims.exp,
        iat: token_data.claims.iat.unwrap_or_else(|| Utc::now().timestamp()),
        iss: "pocketbase".to_string(),
    };

    info!("Validated PocketBase token (direct) for user: {}", claims.sub);
    Ok(claims)
}

pub async fn jwt_auth_middleware<B>(
    request: axum::http::Request<B>,
    next: Next<B>,
) -> impl IntoResponse {
    // Extract state from request extensions
    let state = match request.extensions().get::<AppState>() {
        Some(state) => state,
        None => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "App state not found"}))
            ).into_response();
        }
    };

    // Extract Authorization header
    let auth_header = request.headers().get(AUTHORIZATION);

    match auth_header {
        Some(auth_value) => {
            let auth_str = auth_value.to_str().unwrap_or("");

            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..]; // Remove "Bearer " prefix

                // Try Gateway JWT token first
                let claims_result: Result<Claims, Box<dyn std::error::Error>> = match state.auth_service.validate_token_with_db(token, &state.database_pool).await {
                    Ok(claims) => {
                        info!("Validated Gateway JWT token for user: {}", claims.sub);
                        Ok(claims)
                    }
                    Err(gateway_err) => {
                        // Gateway JWT failed, try PocketBase token (API validation)
                        info!("Gateway JWT validation failed ({}), trying PocketBase token", gateway_err);
                        match validate_pocketbase_token(token).await {
                            Ok(claims) => {
                                info!("Validated PocketBase token for user: {}", claims.sub);
                                Ok(claims)
                            }
                            Err(pb_err) => {
                                warn!("Both Gateway JWT and PocketBase token validation failed. Gateway: {}, PocketBase: {}", gateway_err, pb_err);
                                Err("Invalid token".into())
                            }
                        }
                    }
                };

                match claims_result {
                    Ok(claims) => {
                        // Token is valid, add user info to request extensions
                        let mut request = request;
                        request.extensions_mut().insert(claims);

                        // Continue to next handler
                        next.run(request).await
                    }
                    Err(_) => {
                        (
                            StatusCode::UNAUTHORIZED,
                            Json(json!({
                                "error": "Invalid token"
                            }))
                        ).into_response()
                    }
                }
            } else {
                // Invalid authorization format
                (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({
                        "error": "Invalid authorization format. Expected 'Bearer <token>'"
                    }))
                ).into_response()
            }
        }
        None => {
            // No authorization header
            (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "error": "Authorization header required"
                }))
            ).into_response()
        }
    }
}
