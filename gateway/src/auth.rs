use axum::{
    extract::State,
    http::{header::AUTHORIZATION, StatusCode},
    response::IntoResponse,
    Json,
};
use hyper::Request;
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, TokenData, Validation};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::env;
use tracing::{error, warn};
use common_net::database::DatabasePool;

// Helper function to create error response with proper type
fn create_error_response(status: StatusCode, message: &str) -> axum::response::Response {
    (status, message.to_string()).into_response()
}

// Re-export AppState for use in auth module

// JWT Claims structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,  // Subject (user ID)
    pub username: String,
    pub email: String,
    pub role: String,
    pub exp: i64,     // Expiration time
    pub iat: i64,     // Issued at
    pub iss: String,  // Issuer
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: UserInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

// JWT configuration
const JWT_SECRET_KEY: &str = "JWT_SECRET";
const JWT_ISSUER: &str = "gamev1-gateway";
const ACCESS_TOKEN_EXPIRY: i64 = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY: i64 = 7 * 24 * 60 * 60; // 7 days

// Authentication utilities
#[derive(Clone)]
pub struct AuthService {
    #[allow(dead_code)]
    secret: String,
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl std::fmt::Debug for AuthService {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AuthService")
            .field("secret", &"[REDACTED]")
            .field("encoding_key", &"[EncodingKey]")
            .field("decoding_key", &"[DecodingKey]")
            .finish()
    }
}

impl AuthService {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let secret = env::var(JWT_SECRET_KEY)
            .unwrap_or_else(|_| "your-secret-key-change-in-production".to_string());

        let encoding_key = EncodingKey::from_secret(secret.as_ref());
        let decoding_key = DecodingKey::from_secret(secret.as_ref());

        Ok(Self {
            secret,
            encoding_key,
            decoding_key,
        })
    }

    // Generate JWT token
    pub fn generate_token(&self, user: &User) -> Result<String, Box<dyn std::error::Error>> {
        let now = Utc::now();
        let exp = now + Duration::minutes(ACCESS_TOKEN_EXPIRY);

        let claims = Claims {
            sub: user.id.clone(),
            username: user.username.clone(),
            email: user.email.clone(),
            role: user.role.clone(),
            exp: exp.timestamp(),
            iat: now.timestamp(),
            iss: JWT_ISSUER.to_string(),
        };

        let token = encode(&Header::default(), &claims, &self.encoding_key)?;
        Ok(token)
    }

    // Generate refresh token
    pub fn generate_refresh_token(&self, user: &User) -> Result<String, Box<dyn std::error::Error>> {
        let now = Utc::now();
        let exp = now + Duration::minutes(REFRESH_TOKEN_EXPIRY);

        let mut refresh_claims = Claims {
            sub: user.id.clone(),
            username: user.username.clone(),
            email: user.email.clone(),
            role: user.role.clone(),
            exp: exp.timestamp(),
            iat: now.timestamp(),
            iss: JWT_ISSUER.to_string(),
        };

        // Add refresh token indicator
        refresh_claims.role.push_str(":refresh");

        let token = encode(&Header::default(), &refresh_claims, &self.encoding_key)?;
        Ok(token)
    }

    // Verify JWT token
    pub fn verify_token(&self, token: &str) -> Result<TokenData<Claims>, Box<dyn std::error::Error>> {
        let validation = Validation::default();
        let token_data = decode::<Claims>(token, &self.decoding_key, &validation)?;
        Ok(token_data)
    }

    // Validate JWT token and return claims (for middleware)
    pub async fn validate_token_with_db(
        &self,
        token: &str,
        database_pool: &DatabasePool,
    ) -> Result<Claims, Box<dyn std::error::Error>> {
        let token_data = self.verify_token(token)?;

        // Check if token is expired
        let now = chrono::Utc::now().timestamp();
        if token_data.claims.exp < now {
            return Err("Token expired".into());
        }

        // Check if token is blacklisted
        let token_jti = format!("token_{}", token_data.claims.iat);
        if database_pool.is_token_blacklisted(&token_jti).await.map_err(|e| format!("Database error: {:?}", e))? {
            return Err("Token has been revoked".into());
        }

        Ok(token_data.claims)
    }

    // Hash password using bcrypt
    pub fn hash_password(password: &str) -> Result<String, Box<dyn std::error::Error>> {
        Ok(bcrypt::hash(password, 12)?)
    }

    // Verify password
    pub fn verify_password(password: &str, hash: &str) -> Result<bool, Box<dyn std::error::Error>> {
        Ok(bcrypt::verify(password, hash)?)
    }
}

// Extract user ID from request
pub async fn extract_user_id_from_request(
    request: &Request<hyper::Body>,
) -> Result<Option<String>, Box<dyn std::error::Error>> {
    if let Some(auth_header) = request.headers().get(AUTHORIZATION) {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {

                // Initialize auth service if not exists
                let auth_service = AuthService::new()?;

                match auth_service.verify_token(token) {
                    Ok(token_data) => {
                        return Ok(Some(token_data.claims.sub));
                    }
                    Err(e) => {
                        warn!("Invalid token: {}", e);
                    }
                }
            }
        }
    }

    Ok(None)
}

// Authentication middleware (for protected routes only)
pub async fn auth_middleware<B>(
    State(state): State<crate::AppState>,
    request: axum::http::Request<B>,
    next: axum::middleware::Next<B>,
) -> impl IntoResponse {
    use axum::{http::StatusCode, Json};

    // Extract Authorization header
    let auth_header = request.headers().get(AUTHORIZATION);

    match auth_header {
        Some(auth_value) => {
            let auth_str = auth_value.to_str().unwrap_or("");

            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..]; // Remove "Bearer " prefix

                // Validate JWT token with database check
                match state.auth_service.validate_token_with_db(token, &state.database_pool).await {
                    Ok(claims) => {
                        // Token is valid, add user info to request extensions
                        let mut request = request;
                        request.extensions_mut().insert(claims);

                        // Continue to next handler
                        next.run(request).await
                    }
                    Err(e) => {
                        // Token is invalid, expired, or blacklisted
                        let error_message = if e.to_string().contains("revoked") {
                            "Token has been revoked"
                        } else if e.to_string().contains("expired") {
                            "Token has expired"
                        } else {
                            "Invalid token"
                        };

                        (
                            StatusCode::UNAUTHORIZED,
                            Json(serde_json::json!({
                                "error": error_message
                            }))
                        ).into_response()
                    }
                }
            } else {
                // Invalid authorization format
                (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({
                        "error": "Invalid authorization format. Expected 'Bearer <token>'"
                    }))
                ).into_response()
            }
        }
        None => {
            // No authorization header
            (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Authorization header required"
                }))
            ).into_response()
        }
    }
}

// Login handler
pub async fn login_handler(
    Json(payload): Json<AuthRequest>,
) -> axum::response::Response {
    // Create auth service with the same JWT_SECRET as used in main
    let auth_service = match AuthService::new() {
        Ok(service) => service,
        Err(e) => {
            error!("Failed to initialize auth service: {}", e);
            return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Authentication service error");
        }
    };

    // Authenticate against PocketBase
    let pocketbase_url = std::env::var("POCKETBASE_URL").unwrap_or_else(|_| "http://localhost:8090".to_string());

    // Create HTTP client with timeout
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .connect_timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(client) => client,
        Err(e) => {
            error!("Failed to create HTTP client for PocketBase auth: {}", e);
            return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Authentication service error");
        }
    };

    // Authenticate with PocketBase
    let auth_data = serde_json::json!({
        "identity": payload.username,
        "password": payload.password
    });

    let auth_url = format!("{}/api/collections/users/auth-with-password", pocketbase_url);
    let response = match client.post(&auth_url).json(&auth_data).send().await {
        Ok(resp) => resp,
        Err(e) => {
            error!("Failed to authenticate with PocketBase: {}", e);
            return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Authentication service error");
        }
    };

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        error!("PocketBase authentication failed: {}", error_text);
        return create_error_response(StatusCode::UNAUTHORIZED, "Invalid credentials");
    }

    // Parse PocketBase response
    let pb_auth: serde_json::Value = match response.json().await {
        Ok(data) => data,
        Err(e) => {
            error!("Failed to parse PocketBase response: {}", e);
            return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Authentication response error");
        }
    };

    // Extract user data from PocketBase response
    let user_record = match pb_auth.get("record") {
        Some(record) => record,
        None => {
            error!("No user record in PocketBase response");
            return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Authentication response error");
        }
    };

    let user = User {
        id: user_record.get("id").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
        username: user_record.get("email").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
        email: user_record.get("email").and_then(|v| v.as_str()).unwrap_or("unknown").to_string(),
        role: "user".to_string(),
    };

    // Generate JWT tokens
    match auth_service.generate_token(&user) {
            Ok(access_token) => {
                match auth_service.generate_refresh_token(&user) {
                    Ok(refresh_token) => {
                        let response = AuthResponse {
                            access_token,
                            refresh_token,
                            token_type: "Bearer".to_string(),
                            expires_in: ACCESS_TOKEN_EXPIRY * 60,
                            user: UserInfo {
                                id: user.id,
                                username: user.username,
                                email: user.email,
                                role: user.role,
                            },
                        };

                        return (StatusCode::OK, Json(response)).into_response();
                    }
                    Err(e) => {
                        error!("Failed to generate refresh token: {}", e);
                        return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Token generation error");
                    }
                }
            }
            Err(e) => {
                error!("Failed to generate access token: {}", e);
                return (StatusCode::INTERNAL_SERVER_ERROR, "Token generation error").into_response();
            }
        }

}

// Register handler
pub async fn register_handler(
    Json(payload): Json<RegisterRequest>,
) -> axum::response::Response {
    // Create auth service with the same JWT_SECRET as used in main
    let auth_service = match AuthService::new() {
        Ok(service) => service,
        Err(e) => {
            error!("Failed to initialize auth service: {}", e);
            return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Authentication service error");
        }
    };

    // Validate input
    if !payload.email.contains('@') || !payload.email.contains('.') || payload.password.len() < 6 {
        return create_error_response(StatusCode::BAD_REQUEST, "Invalid email or password (password must be at least 6 characters)");
    }

    // Create user in PocketBase first
    let pocketbase_url = std::env::var("POCKETBASE_URL").unwrap_or_else(|_| "http://localhost:8090".to_string());

    // Create HTTP client with timeout
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .connect_timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(client) => client,
        Err(e) => {
            error!("Failed to create HTTP client for PocketBase registration: {}", e);
            return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Registration service error");
        }
    };

    // Create user data for PocketBase
    let user_data = serde_json::json!({
        "email": payload.email,
        "password": payload.password,
        "passwordConfirm": payload.password,
        "username": payload.username
    });

    let create_url = format!("{}/api/collections/users/records", pocketbase_url);
    let response = match client.post(&create_url).json(&user_data).send().await {
        Ok(resp) => resp,
        Err(e) => {
            error!("Failed to create user in PocketBase: {}", e);
            return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Registration service error");
        }
    };

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        error!("PocketBase user creation failed: {}", error_text);

        // Check for specific error types
        if status == StatusCode::BAD_REQUEST && error_text.contains("email") {
            return create_error_response(StatusCode::CONFLICT, "Email already exists");
        }

        return create_error_response(StatusCode::BAD_REQUEST, "Failed to create user account");
    }

    // Parse PocketBase response to get the created user
    let pb_user: serde_json::Value = match response.json().await {
        Ok(data) => data,
        Err(e) => {
            error!("Failed to parse PocketBase user creation response: {}", e);
            return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Registration response error");
        }
    };

    // Extract user data from PocketBase response
    let user_id = pb_user.get("id").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
    let user_email = pb_user.get("email").and_then(|v| v.as_str()).unwrap_or(&payload.email).to_string();
    let user_username = pb_user.get("username").and_then(|v| v.as_str()).unwrap_or(&payload.username).to_string();

    // Create User struct for JWT generation
    let user = User {
        id: user_id,
        username: user_username,
        email: user_email,
        role: "user".to_string(),
    };

    // Generate JWT tokens
    match auth_service.generate_token(&user) {
        Ok(access_token) => {
            match auth_service.generate_refresh_token(&user) {
                Ok(refresh_token) => {
                    let response = AuthResponse {
                        access_token,
                        refresh_token,
                        token_type: "Bearer".to_string(),
                        expires_in: ACCESS_TOKEN_EXPIRY * 60,
                        user: UserInfo {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            role: user.role,
                        },
                    };

                    (StatusCode::CREATED, Json(response)).into_response()
                }
                Err(e) => {
                    error!("Failed to generate refresh token: {}", e);
                    create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Token generation error")
                }
            }
        }
        Err(e) => {
            error!("Failed to generate access token: {}", e);
            create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Token generation error")
        }
    }
}

// Refresh token handler
pub async fn refresh_handler(
    axum::extract::State(state): axum::extract::State<crate::AppState>,
    Json(payload): Json<RefreshRequest>,
) -> axum::response::Response {
    // Initialize auth service
    let auth_service = match AuthService::new() {
        Ok(service) => service,
        Err(e) => {
            error!("Failed to initialize auth service: {}", e);
            return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Authentication service error");
        }
    };

    // Verify refresh token
    match auth_service.verify_token(&payload.refresh_token) {
        Ok(token_data) => {
            // Check if it's a refresh token
            if !token_data.claims.role.ends_with(":refresh") {
                return create_error_response(StatusCode::UNAUTHORIZED, "Invalid refresh token");
            }

            // Get user from database using token_data.claims.sub
            let user_id = token_data.claims.sub.clone();
            let user = match state.database_pool.get_player(&user_id).await {
                Ok(Some(player_record)) => {
                    // Convert PlayerRecord to User struct
                    User {
                        id: player_record.id.unwrap_or_else(|| user_id.clone()),
                        username: player_record.username.clone(),
                        email: player_record.email.clone(),
                        role: "user".to_string(), // Default role, could be extended
                    }
                }
                Ok(None) => {
                    error!("User not found in database: {}", user_id);
                    return create_error_response(StatusCode::UNAUTHORIZED, "User not found");
                }
                Err(e) => {
                    error!("Database error when fetching user: {}", e);
                    return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Database error");
                }
            };

            // Generate new tokens
            match auth_service.generate_token(&user) {
                Ok(access_token) => {
                    match auth_service.generate_refresh_token(&user) {
                        Ok(refresh_token) => {
                            let response = AuthResponse {
        access_token,
        refresh_token,
                                token_type: "Bearer".to_string(),
                                expires_in: ACCESS_TOKEN_EXPIRY * 60,
                                user: UserInfo {
                                    id: user.id,
                                    username: user.username,
                                    email: user.email,
                                    role: user.role,
                                },
                            };

                            (StatusCode::OK, Json(response)).into_response()
                        }
                        Err(e) => {
                            error!("Failed to generate refresh token: {}", e);
                            create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Token generation error")
                        }
                    }
                }
                Err(e) => {
                    error!("Failed to generate access token: {}", e);
                    create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Token generation error")
                }
            }
        }
        Err(e) => {
            warn!("Invalid refresh token: {}", e);
            create_error_response(StatusCode::UNAUTHORIZED, "Invalid refresh token")
        }
    }
}

// Logout handler
pub async fn logout_handler(
    axum::extract::State(state): axum::extract::State<crate::AppState>,
    request: Request<hyper::Body>,
) -> axum::response::Response {
    // Extract token from Authorization header
    if let Some(auth_header) = request.headers().get(AUTHORIZATION) {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                // Initialize auth service
                let auth_service = match AuthService::new() {
                    Ok(service) => service,
                    Err(e) => {
                        error!("Failed to initialize auth service: {}", e);
                        return create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Authentication service error");
                    }
                };

                // Verify and decode token to get claims
                match auth_service.verify_token(token) {
                    Ok(token_data) => {
                        // Add token to blacklist
                        let token_jti = format!("token_{}", token_data.claims.iat); // Use iat as unique identifier
                        let expires_at = token_data.claims.exp;

                        match state.database_pool.blacklist_token(&token_jti, expires_at).await {
                            Ok(_) => {
                                tracing::info!("Token blacklisted successfully for user: {}", token_data.claims.sub);
                                create_error_response(StatusCode::OK, "Logged out successfully")
                            }
                            Err(e) => {
                                error!("Failed to blacklist token: {}", e);
                                create_error_response(StatusCode::INTERNAL_SERVER_ERROR, "Logout failed")
                            }
                        }
                    }
                    Err(e) => {
                        warn!("Invalid token during logout: {}", e);
                        create_error_response(StatusCode::BAD_REQUEST, "Invalid token")
                    }
                }
            } else {
                create_error_response(StatusCode::BAD_REQUEST, "Invalid authorization format")
            }
        } else {
            create_error_response(StatusCode::BAD_REQUEST, "Invalid authorization header")
        }
    } else {
        create_error_response(StatusCode::BAD_REQUEST, "Authorization header required")
    }
}

// Authenticate user with PocketBase
// async fn authenticate_with_pocketbase(email: &str, password: &str) -> Result<User, Box<dyn std::error::Error>> {
//     use serde::{Deserialize, Serialize};
// 
//     #[derive(Debug, Serialize)]
//     struct AuthRequest {
//         identity: String,
//         password: String,
//     }
// 
//     #[derive(Debug, Deserialize)]
//     struct AuthResponse {
//         #[allow(dead_code)]
//         token: String,
//         record: PocketBaseUser,
//     }
// 
//     #[derive(Debug, Deserialize)]
//     struct PocketBaseUser {
//         id: String,
//         email: String,
//         username: Option<String>,
//         #[allow(dead_code)]
//         verified: bool,
//     }
// 
//     // Create auth request
//     let auth_payload = AuthRequest {
//         identity: email.to_string(),
//         password: password.to_string(),
//     };
// 
//     // Send authentication request to PocketBase
//     let client = reqwest::Client::new();
//     let response = client
//         .post("http://localhost:8090/api/collections/users/auth-with-password")
//         .header("Content-Type", "application/json")
//         .json(&auth_payload)
//         .send()
//         .await?;
// 
//     if !response.status().is_success() {
//         return Err(format!("Authentication failed: {}", response.status()).into());
//     }
// 
//     let auth_response: AuthResponse = response.json().await?;
// 
//     // TODO: Check if user is verified (temporarily disabled for testing)
//     // if !auth_response.record.verified {
//     //     return Err("User email not verified".into());
//     // }
// 
//     // Convert PocketBase user to our User struct
//     let user = User {
//         id: auth_response.record.id,
//         username: auth_response.record.username.unwrap_or_else(|| auth_response.record.email.clone()),
//         email: auth_response.record.email,
//         role: "user".to_string(), // Default role
//     };
// 
//     Ok(user)
// }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_service_creation() {
        let auth_service = AuthService::new();
        assert!(auth_service.is_ok());
    }

    #[test]
    fn test_password_hashing() {
        let password = "test_password";
        let hash = AuthService::hash_password(password);
        assert!(hash.is_ok());

        let is_valid = AuthService::verify_password(password, &hash.unwrap());
        assert!(is_valid.is_ok());
        assert!(is_valid.unwrap());
    }

    #[test]
    fn test_token_generation() {
        let auth_service = AuthService::new().unwrap();

        let user = User {
            id: "test-id".to_string(),
            username: "testuser".to_string(),
            email: "test@example.com".to_string(),
            role: "user".to_string(),
        };

        let token = auth_service.generate_token(&user);
        assert!(token.is_ok());

        let refresh_token = auth_service.generate_refresh_token(&user);
        assert!(refresh_token.is_ok());
    }
}
