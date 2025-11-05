use reqwest::Client as HttpClient;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/// PocketBase record structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PocketBaseRecord<T> {
    pub id: String,
    pub collectionId: String,
    pub collectionName: String,
    pub created: String,
    pub updated: String,
    pub data: T,
}

/// PocketBase list response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PocketBaseListResponse<T> {
    pub page: u32,
    pub perPage: u32,
    pub totalItems: u32,
    pub totalPages: u32,
    pub items: Vec<PocketBaseRecord<T>>,
}

/// PocketBase auth response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PocketBaseAuthResponse {
    pub token: String,
    pub record: serde_json::Value,
}

/// Simplified PocketBase client using REST API
pub struct PocketBaseClient {
    client: HttpClient,
    base_url: String,
    auth_token: Option<String>,
}

impl PocketBaseClient {
    pub fn new(base_url: &str) -> Self {
        Self {
            client: HttpClient::new(),
            base_url: base_url.trim_end_matches('/').to_string(),
            auth_token: None,
        }
    }

    pub fn set_auth_token(&mut self, token: String) {
        self.auth_token = Some(token);
    }

    pub async fn authenticate(&mut self, email: &str, password: &str) -> Result<PocketBaseAuthResponse, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/admins/auth-with-password", self.base_url);

        let mut request_body = HashMap::new();
        request_body.insert("identity", email);
        request_body.insert("password", password);

        let response = self.client
            .post(&url)
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Authentication failed: {}", response.status()).into());
        }

        let auth_response: PocketBaseAuthResponse = response.json().await?;
        self.auth_token = Some(auth_response.token.clone());

        Ok(auth_response)
    }

    pub async fn create_record<T: Serialize + for<'de> Deserialize<'de>>(
        &self,
        collection: &str,
        data: T,
    ) -> Result<PocketBaseRecord<T>, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/api/collections/{}/records", self.base_url, collection);

        let mut request = self.client.post(&url).json(&data);

        if let Some(token) = &self.auth_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request.send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("Create record failed: {} - {}", status, error_text).into());
        }

        let record: PocketBaseRecord<T> = response.json().await?;
        Ok(record)
    }

    pub async fn list_records<T: for<'de> Deserialize<'de>>(
        &self,
        collection: &str,
        filter: Option<&str>,
        sort: Option<&str>,
        limit: Option<u32>,
    ) -> Result<Vec<PocketBaseRecord<T>>, Box<dyn std::error::Error + Send + Sync>> {
        let mut url = format!("{}/api/collections/{}/records", self.base_url, collection);

        let mut params = Vec::new();

        if let Some(filter) = filter {
            params.push(("filter", filter.to_string()));
        }

        if let Some(sort) = sort {
            params.push(("sort", sort.to_string()));
        }

        if let Some(limit) = limit {
            params.push(("limit", limit.to_string()));
        }

        if !params.is_empty() {
            let query_string = params.iter()
                .map(|(k, v)| format!("{}={}", k, urlencoding::encode(v)))
                .collect::<Vec<_>>()
                .join("&");
            url = format!("{}?{}", url, query_string);
        }

        let mut request = self.client.get(&url);

        if let Some(token) = &self.auth_token {
            request = request.header("Authorization", format!("Bearer {}", token));
        }

        let response = request.send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("List records failed: {} - {}", status, error_text).into());
        }

        let list_response: PocketBaseListResponse<T> = response.json().await?;
        Ok(list_response.items)
    }
}

/// Thread-safe PocketBase client wrapper
#[derive(Clone)]
pub struct SharedPocketBaseClient {
    client: Arc<tokio::sync::RwLock<PocketBaseClient>>,
}

impl SharedPocketBaseClient {
    pub async fn new(base_url: &str) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let client = PocketBaseClient::new(base_url);

        // Authenticate with PocketBase admin
        let mut client = tokio::sync::RwLock::new(client);
        {
            let mut client_mut = client.get_mut();
            // Try to authenticate, but don't fail if it doesn't work (for fallback)
            let _ = client_mut.authenticate("admin@pocketbase.local", "123456789").await;
        }

        Ok(Self {
            client: Arc::new(client),
        })
    }

    pub async fn authenticate(&self, email: &str, password: &str) -> Result<PocketBaseAuthResponse, Box<dyn std::error::Error + Send + Sync>> {
        let mut client = self.client.write().await;
        client.authenticate(email, password).await
    }

    pub async fn create_record<T: Serialize + for<'de> Deserialize<'de>>(
        &self,
        collection: &str,
        data: T,
    ) -> Result<PocketBaseRecord<T>, Box<dyn std::error::Error + Send + Sync>> {
        let client = self.client.read().await;
        client.create_record(collection, data).await
    }

    pub async fn list_records<T: for<'de> Deserialize<'de>>(
        &self,
        collection: &str,
        filter: Option<&str>,
        sort: Option<&str>,
        limit: Option<u32>,
    ) -> Result<Vec<PocketBaseRecord<T>>, Box<dyn std::error::Error + Send + Sync>> {
        let client = self.client.read().await;
        client.list_records(collection, filter, sort, limit).await
    }
}
