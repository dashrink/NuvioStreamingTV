//! Trakt.tv authentication module
//!
//! This module provides OAuth2 authentication support for Trakt.tv,
//! including token refresh callbacks for native platform notifications.

use chrono::Utc;
use oauth2::basic::BasicClient;
use oauth2::reqwest::async_http_client;
use oauth2::{AuthUrl, ClientId, ClientSecret, RedirectUrl, RefreshToken, TokenResponse, TokenUrl};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{error, info};

/// Callback trait for token refresh events
///
/// Implement this trait in your native platform code (iOS/Android) to receive
/// notifications when OAuth tokens are refreshed or when refresh fails.
/// This allows native code to update UI, persist tokens, or handle errors.
///
/// # Example (Kotlin)
/// ```kotlin
/// class TraktTokenHandler : TraktTokenCallback {
///     override fun onTokenRefreshed(accessToken: String, expiresAt: Long) {
///         // Update local storage
///         secureStorage.saveToken(accessToken, expiresAt)
///         // Update UI if needed
///         notifyUserTokenRefreshed()
///     }
///
///     override fun onTokenRefreshFailed(error: String) {
///         // Log the error
///         Log.e("Trakt", "Token refresh failed: $error")
///         // Notify user to re-authenticate
///         promptUserReAuthentication()
///     }
/// }
/// ```
///
/// # Example (Swift)
/// ```swift
/// class TraktTokenHandler: TraktTokenCallback {
///     func onTokenRefreshed(accessToken: String, expiresAt: Int64) {
///         // Update keychain
///         KeychainHelper.save(token: accessToken, expiresAt: expiresAt)
///         // Post notification
///         NotificationCenter.default.post(name: .traktTokenRefreshed, object: nil)
///     }
///
///     func onTokenRefreshFailed(error: String) {
///         // Log the error
///         print("Token refresh failed: \(error)")
///         // Show alert to user
///         showReAuthenticationAlert()
///     }
/// }
/// ```
#[uniffi::export(callback_interface)]
pub trait TraktTokenCallback: Send + Sync {
    /// Called when an OAuth token is successfully refreshed
    ///
    /// # Parameters
    /// - `access_token`: The new access token to use for API requests
    /// - `expires_at`: Unix timestamp (seconds since epoch) when the token expires
    ///
    /// # Platform Implementation Notes
    /// - **iOS**: Store the token securely in Keychain
    /// - **Android**: Store the token securely in KeyStore or EncryptedSharedPreferences
    /// - Update any in-memory caches or UI state as needed
    /// - Consider posting a notification event for other parts of the app
    fn on_token_refreshed(&self, access_token: String, expires_at: i64);

    /// Called when token refresh fails
    ///
    /// # Parameters
    /// - `error`: Human-readable error message describing why the refresh failed
    ///
    /// # Common Failure Scenarios
    /// - Network connectivity issues
    /// - Invalid or expired refresh token (user needs to re-authenticate)
    /// - Trakt.tv API service downtime
    /// - Rate limiting (429 responses)
    ///
    /// # Platform Implementation Notes
    /// - Log the error for debugging
    /// - If the error indicates an invalid refresh token, prompt user to re-authenticate
    /// - Consider implementing exponential backoff for retries
    /// - Update UI to reflect authentication state
    fn on_token_refresh_failed(&self, error: String);
}

/// OAuth2 token storage structure
///
/// Stores the access token, refresh token, and expiration timestamp.
/// This structure is serialized to JSON for persistent storage.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64, // Unix timestamp (seconds since epoch)
}

/// Authentication errors
// AuthError is now re-exported from super::TraktError for backward compatibility
pub use super::TraktError as AuthError;

/// Authentication manager for Trakt.tv OAuth2
///
/// Handles OAuth2 flows, token storage, and automatic token refresh.
/// Optionally invokes callbacks when tokens are refreshed or refresh fails.
pub struct AuthManager {
    oauth_client: BasicClient,
    tokens: Arc<Mutex<Option<StoredTokens>>>,
    callback: Option<Arc<dyn TraktTokenCallback>>,
}

impl AuthManager {
    /// Creates a new authentication manager
    ///
    /// # Parameters
    /// - `client_id`: Trakt API client ID
    /// - `client_secret`: Trakt API client secret
    /// - `redirect_uri`: OAuth2 redirect URI
    /// - `callback`: Optional callback for token refresh notifications
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::AuthManager;
    ///
    /// let auth_manager = AuthManager::new(
    ///     "your_client_id".to_string(),
    ///     "your_client_secret".to_string(),
    ///     "urn:ietf:wg:oauth:2.0:oob".to_string(),
    ///     None,
    /// ).unwrap();
    /// ```
    pub fn new(
        client_id: String,
        client_secret: String,
        redirect_uri: String,
        callback: Option<Arc<dyn TraktTokenCallback>>,
    ) -> Result<Self, AuthError> {
        let auth_url = AuthUrl::new("https://trakt.tv/oauth/authorize".to_string())
            .map_err(|e| super::TraktError::oauth2(format!("Invalid auth URL: {}", e)))?;
        let token_url = TokenUrl::new("https://api.trakt.tv/oauth/token".to_string())
            .map_err(|e| super::TraktError::oauth2(format!("Invalid token URL: {}", e)))?;

        let oauth_client = BasicClient::new(
            ClientId::new(client_id),
            Some(ClientSecret::new(client_secret)),
            auth_url,
            Some(token_url),
        )
        .set_redirect_uri(
            RedirectUrl::new(redirect_uri)
                .map_err(|e| super::TraktError::oauth2(format!("Invalid redirect URI: {}", e)))?,
        );

        Ok(Self {
            oauth_client,
            tokens: Arc::new(Mutex::new(None)),
            callback,
        })
    }

    /// Stores OAuth2 tokens
    ///
    /// # Parameters
    /// - `access_token`: The access token
    /// - `refresh_token`: The refresh token
    /// - `expires_in_secs`: Token expiration duration in seconds
    pub fn store_tokens(&self, access_token: String, refresh_token: String, expires_in_secs: i64) {
        let expires_at = Utc::now().timestamp() + expires_in_secs;
        let stored = StoredTokens {
            access_token,
            refresh_token,
            expires_at,
        };

        info!(
            "Storing tokens (expires at: {})",
            chrono::DateTime::from_timestamp(expires_at, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_else(|| "unknown".to_string())
        );

        *self.tokens.lock() = Some(stored);
    }

    /// Gets the current access token
    ///
    /// Automatically refreshes the token if it's expired or expiring soon (within 5 minutes).
    /// Invokes the token callback if a refresh occurs.
    ///
    /// # Returns
    /// - `Ok(Some(token))`: Valid access token
    /// - `Ok(None)`: No tokens stored
    /// - `Err(_)`: Token refresh failed
    pub async fn get_access_token(&self) -> Result<Option<String>, super::TraktError> {
        let tokens_opt = self.tokens.lock().clone();

        match tokens_opt {
            Some(tokens) => {
                let now = Utc::now().timestamp();
                // 5-minute buffer for token expiry
                if tokens.expires_at < now + 300 {
                    info!(
                        "Token expired or expiring soon (expires_at: {}, now: {}), refreshing...",
                        tokens.expires_at, now
                    );
                    let new_token = self.refresh_token().await?;
                    Ok(Some(new_token))
                } else {
                    Ok(Some(tokens.access_token))
                }
            }
            None => Ok(None),
        }
    }

    /// Refreshes the OAuth2 access token
    ///
    /// Uses the stored refresh token to obtain a new access token.
    /// Invokes the token callback on success or failure.
    ///
    /// # Returns
    /// - `Ok(access_token)`: New access token
    /// - `Err(_)`: Refresh failed (callback is invoked with error)
    pub async fn refresh_token(&self) -> Result<String, super::TraktError> {
        let tokens = self
            .tokens
            .lock()
            .clone()
            .ok_or_else(|| super::TraktError::invalid_token("No tokens stored".to_string()))?;

        info!("Refreshing OAuth2 token...");

        let current_refresh_token = tokens.refresh_token.clone();
        let refresh_token = RefreshToken::new(current_refresh_token.clone());

        match self
            .oauth_client
            .exchange_refresh_token(&refresh_token)
            .request_async(async_http_client)
            .await
        {
            Ok(token_result) => {
                let access_token = token_result.access_token().secret().clone();
                let expires_in = token_result
                    .expires_in()
                    .map(|d| d.as_secs() as i64)
                    .unwrap_or(7200); // Default 2 hours
                let new_refresh_token = token_result
                    .refresh_token()
                    .map(|t| t.secret().clone())
                    .unwrap_or(current_refresh_token);

                let expires_at = Utc::now().timestamp() + expires_in;

                // Store the new tokens
                self.store_tokens(access_token.clone(), new_refresh_token, expires_in);

                info!("Token refresh successful (expires at: {})", expires_at);

                // Notify callback on success
                if let Some(callback) = &self.callback {
                    callback.on_token_refreshed(access_token.clone(), expires_at);
                }

                Ok(access_token)
            }
            Err(e) => {
                let error_msg = format!("Failed to refresh token: {}", e);
                error!("{}", error_msg);

                // Notify callback on failure
                if let Some(callback) = &self.callback {
                    callback.on_token_refresh_failed(error_msg.clone());
                }

                Err(super::TraktError::oauth2(error_msg))
            }
        }
    }

    /// Clears stored tokens
    pub fn clear_tokens(&self) {
        info!("Clearing stored tokens");
        *self.tokens.lock() = None;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};

    /// Mock callback for testing
    struct MockCallback {
        refresh_called: AtomicBool,
        refresh_access_token: Mutex<String>,
        refresh_expires_at: AtomicI64,
        failure_called: AtomicBool,
        failure_error: Mutex<String>,
    }

    impl MockCallback {
        fn new() -> Self {
            Self {
                refresh_called: AtomicBool::new(false),
                refresh_access_token: Mutex::new(String::new()),
                refresh_expires_at: AtomicI64::new(0),
                failure_called: AtomicBool::new(false),
                failure_error: Mutex::new(String::new()),
            }
        }

        fn was_refresh_called(&self) -> bool {
            self.refresh_called.load(Ordering::SeqCst)
        }

        fn was_failure_called(&self) -> bool {
            self.failure_called.load(Ordering::SeqCst)
        }

        fn get_refresh_data(&self) -> (String, i64) {
            (
                self.refresh_access_token.lock().clone(),
                self.refresh_expires_at.load(Ordering::SeqCst),
            )
        }

        fn get_failure_error(&self) -> String {
            self.failure_error.lock().clone()
        }
    }

    impl TraktTokenCallback for MockCallback {
        fn on_token_refreshed(&self, access_token: String, expires_at: i64) {
            self.refresh_called.store(true, Ordering::SeqCst);
            *self.refresh_access_token.lock() = access_token;
            self.refresh_expires_at.store(expires_at, Ordering::SeqCst);
        }

        fn on_token_refresh_failed(&self, error: String) {
            self.failure_called.store(true, Ordering::SeqCst);
            *self.failure_error.lock() = error;
        }
    }

    #[test]
    fn test_auth_manager_creation() {
        let auth = AuthManager::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            None,
        );
        assert!(auth.is_ok());
    }

    #[test]
    fn test_auth_manager_with_callback() {
        let callback = Arc::new(MockCallback::new());
        let auth = AuthManager::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            Some(callback.clone()),
        );
        assert!(auth.is_ok());
    }

    #[test]
    fn test_store_and_get_tokens() {
        let auth = AuthManager::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            None,
        )
        .unwrap();

        auth.store_tokens(
            "test_access_token".to_string(),
            "test_refresh_token".to_string(),
            7200,
        );

        let tokens = auth.tokens.lock();
        assert!(tokens.is_some());
        let tokens = tokens.as_ref().unwrap();
        assert_eq!(tokens.access_token, "test_access_token");
        assert_eq!(tokens.refresh_token, "test_refresh_token");
    }

    #[test]
    fn test_clear_tokens() {
        let auth = AuthManager::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            None,
        )
        .unwrap();

        auth.store_tokens(
            "test_access_token".to_string(),
            "test_refresh_token".to_string(),
            7200,
        );

        assert!(auth.tokens.lock().is_some());

        auth.clear_tokens();
        assert!(auth.tokens.lock().is_none());
    }

    #[tokio::test]
    async fn test_refresh_token_callback_on_failure() {
        let callback = Arc::new(MockCallback::new());
        let auth = AuthManager::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            Some(callback.clone()),
        )
        .unwrap();

        // Store expired tokens
        auth.store_tokens(
            "test_access_token".to_string(),
            "invalid_refresh_token".to_string(),
            -3600, // Expired 1 hour ago
        );

        // Attempt to refresh (will fail with invalid token)
        let result = auth.refresh_token().await;
        assert!(result.is_err());

        // Verify callback was invoked with failure
        assert!(callback.was_failure_called());
        let error = callback.get_failure_error();
        assert!(error.contains("Failed to refresh token"));
    }
}
