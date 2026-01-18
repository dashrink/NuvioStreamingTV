use crate::trakt::auth::AuthManager;
use crate::trakt::error::TraktError;
use reqwest::{Client, Method, StatusCode};
use serde::{de::DeserializeOwned, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};
use tracing::{warn, error};

pub struct ApiClient {
    auth_manager: Arc<AuthManager>,
    client_id: String,
    http_client: Client,
    last_call: Arc<Mutex<i64>>,
    min_interval_ms: i64,
}

impl ApiClient {
    pub fn new(
        auth_manager: Arc<AuthManager>,
        client_id: String,
    ) -> Self {
        Self {
            auth_manager,
            client_id,
            http_client: Client::new(),
            last_call: Arc::new(Mutex::new(0)),
            min_interval_ms: 500,
        }
    }

    pub async fn request<T, B>(
        &self,
        method: Method,
        endpoint: &str,
        body: Option<B>,
    ) -> Result<T, TraktError>
    where
        T: DeserializeOwned,
        B: Serialize,
    {
        self.request_with_retry(method, endpoint, body, 0).await
    }

    async fn request_with_retry<T, B>(
        &self,
        method: Method,
        endpoint: &str,
        body: Option<B>,
        retry_count: u32,
    ) -> Result<T, TraktError>
    where
        T: DeserializeOwned,
        B: Serialize,
    {
        // Rate limiting logic
        {
            let mut last_call = self.last_call.lock().await;
            let now = chrono::Utc::now().timestamp_millis();
            let elapsed = now - *last_call;
            
            if elapsed < self.min_interval_ms {
                let delay = self.min_interval_ms - elapsed;
                sleep(Duration::from_millis(delay as u64)).await;
            }
            *last_call = chrono::Utc::now().timestamp_millis();
        }

        let access_token = self.auth_manager.get_access_token().await?
            .ok_or_else(|| TraktError::AuthError("Not authenticated".to_string()))?;

        let url = format!("https://api.trakt.tv{}", endpoint);
        let mut builder = self.http_client.request(method.clone(), &url)
            .header("Content-Type", "application/json")
            .header("trakt-api-version", "2")
            .header("trakt-api-key", &self.client_id)
            .header("Authorization", format!("Bearer {}", access_token));

        if let Some(b) = body {
            builder = builder.json(&b);
        }

        let response = builder.send().await?;
        let status = response.status();

        if status.is_success() {
            if status == StatusCode::NO_CONTENT {
                let data = serde_json::from_str("null")?;
                return Ok(data);
            }
            let data = response.json::<T>().await?;
            return Ok(data);
        }

        if status == StatusCode::TOO_MANY_REQUESTS {
            let max_retries = 3;
            if retry_count < max_retries {
                let retry_after = response.headers()
                    .get("Retry-After")
                    .and_then(|h| h.to_str().ok())
                    .and_then(|s| s.parse::<u64>().ok())
                    .unwrap_or_else(|| 2u64.pow(retry_count) as u64);
                
                warn!("Rate limited (429), retrying in {}s (attempt {}/{})", retry_after, retry_count + 1, max_retries);
                sleep(Duration::from_secs(retry_after)).await;
                return Err(TraktError::RateLimited(retry_after));
            }
        }

        let error_text = response.text().await?;
        error!("API Error {} for {}: {}", status, endpoint, error_text);
        
        match status {
            StatusCode::NOT_FOUND => Err(TraktError::ApiError("Content not found".to_string())),
            StatusCode::CONFLICT => Err(TraktError::ApiError("Conflict (already exists)".to_string())),
            _ => Err(TraktError::ApiError(format!("Request failed with status {}: {}", status, error_text))),
        }
    }

    pub async fn search_by_id(
        &self,
        id_type: &str,
        id: &str,
        item_type: Option<&str>,
    ) -> Result<Vec<crate::trakt::models::TraktSearchItem>, TraktError> {
        let mut endpoint = format!("/search/{}?id_type={}", id_type, id);
        if let Some(t) = item_type {
            endpoint.push_str(&format!("&type={}", t));
        }
        self.request(Method::GET, &endpoint, None::<()>).await
    }
}
