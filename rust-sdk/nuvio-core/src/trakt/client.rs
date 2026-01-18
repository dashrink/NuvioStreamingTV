//! Trakt.tv API client with rate limiting
//!
//! This module provides a low-level HTTP client for the Trakt.tv API
//! with built-in rate limiting using the governor crate.

use governor::{DefaultDirectRateLimiter, Quota, RateLimiter};
use std::num::NonZeroU32;
use std::sync::Arc;

use crate::trakt::models::TraktUserSettings;

/// API client for Trakt.tv with rate limiting
#[derive(uniffi::Object)]
pub struct ApiClient {
    /// Rate limiter for GET requests (read operations)
    read_rate_limiter: Arc<DefaultDirectRateLimiter>,
    /// Rate limiter for POST/PUT/DELETE requests (write operations)
    write_rate_limiter: Arc<DefaultDirectRateLimiter>,
}

// Internal implementation (not exported via UniFFI)
impl ApiClient {
    /// Create a new API client with standard rate limits
    ///
    /// Standard limits:
    /// - Read (GET): 1,000 requests per 5 minutes (200 req/min)
    /// - Write (POST/PUT/DELETE): 1 request per second (60 req/min)
    pub fn new() -> Self {
        Self::new_with_vip_status(false)
    }

    /// Create a new API client with optional VIP rate limits
    ///
    /// VIP limits:
    /// - Read (GET): 10,000 requests per 5 minutes (2,000 req/min)
    /// - Write (POST/PUT/DELETE): 1 request per second (60 req/min)
    pub fn new_with_vip_status(is_vip: bool) -> Self {
        // Calculate read rate limit based on VIP status
        let requests_per_minute = if is_vip {
            // VIP: 10,000 req per 5 min = 2,000 req/min
            NonZeroU32::new(2000).unwrap()
        } else {
            // Standard: 1,000 req per 5 min = 200 req/min
            NonZeroU32::new(200).unwrap()
        };

        let read_quota = Quota::per_minute(requests_per_minute);
        let read_limiter = RateLimiter::direct(read_quota);

        // Write rate limit is same for all users: 1 req/sec = 60 req/min
        let write_quota = Quota::per_minute(NonZeroU32::new(60).unwrap());
        let write_limiter = RateLimiter::direct(write_quota);

        Self {
            read_rate_limiter: Arc::new(read_limiter),
            write_rate_limiter: Arc::new(write_limiter),
        }
    }

    /// Wait for rate limiter permission for a read operation
    pub async fn wait_for_read_permission(&self) {
        self.read_rate_limiter.until_ready().await;
    }

    /// Wait for rate limiter permission for a write operation
    pub async fn wait_for_write_permission(&self) {
        self.write_rate_limiter.until_ready().await;
    }

    /// Get a clone of the read rate limiter (for sharing across instances)
    pub fn read_limiter(&self) -> Arc<DefaultDirectRateLimiter> {
        Arc::clone(&self.read_rate_limiter)
    }

    /// Get a clone of the write rate limiter (for sharing across instances)
    pub fn write_limiter(&self) -> Arc<DefaultDirectRateLimiter> {
        Arc::clone(&self.write_rate_limiter)
    }

    /// Detect VIP status from user settings
    ///
    /// This method parses the TraktUserSettings response from GET /users/settings
    /// to determine if the user has VIP status. VIP users get 10x higher rate limits.
    ///
    /// VIP status is detected if either:
    /// - user.vip is true (standard VIP)
    /// - user.vip_ep is true (executive producer VIP)
    pub fn detect_vip_status(settings: &TraktUserSettings) -> bool {
        settings.user.vip.unwrap_or(false) || settings.user.vip_ep.unwrap_or(false)
    }
}

impl Default for ApiClient {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, Instant};

    #[tokio::test]
    async fn test_read_rate_limiter_standard() {
        let client = ApiClient::new();

        // First request should be immediate
        let start = Instant::now();
        client.wait_for_read_permission().await;
        let elapsed = start.elapsed();

        assert!(
            elapsed < Duration::from_millis(10),
            "First request should be immediate"
        );
    }

    #[tokio::test]
    async fn test_write_rate_limiter() {
        let client = ApiClient::new();

        // First request should be immediate
        let start = Instant::now();
        client.wait_for_write_permission().await;
        let elapsed = start.elapsed();

        assert!(
            elapsed < Duration::from_millis(10),
            "First request should be immediate"
        );
    }

    #[tokio::test]
    async fn test_vip_vs_standard_rate_limits() {
        let standard_client = ApiClient::new_with_vip_status(false);
        let vip_client = ApiClient::new_with_vip_status(true);

        // Both should work, just with different limits
        standard_client.wait_for_read_permission().await;
        vip_client.wait_for_read_permission().await;
    }

    #[tokio::test]
    async fn test_rate_limiter_sharing() {
        let client = ApiClient::new();

        // Clone the rate limiters
        let read_limiter = client.read_limiter();
        let write_limiter = client.write_limiter();

        // Use them independently
        read_limiter.until_ready().await;
        write_limiter.until_ready().await;
    }

    #[test]
    fn test_vip_detection_standard_user() {
        use crate::trakt::models::{
            TraktUserSettings, TraktUserSettingsAccount, TraktUserSettingsUser,
        };

        let settings = TraktUserSettings {
            user: TraktUserSettingsUser {
                username: "standard_user".to_string(),
                private: Some(false),
                name: Some("Standard User".to_string()),
                vip: Some(false),
                vip_ep: Some(false),
            },
            account: TraktUserSettingsAccount {
                timezone: Some("America/Los_Angeles".to_string()),
                date_format: None,
                time_24hr: None,
                cover_image: None,
            },
        };

        assert!(
            !ApiClient::detect_vip_status(&settings),
            "Standard user should not be detected as VIP"
        );
    }

    #[test]
    fn test_vip_detection_vip_user() {
        use crate::trakt::models::{
            TraktUserSettings, TraktUserSettingsAccount, TraktUserSettingsUser,
        };

        let settings = TraktUserSettings {
            user: TraktUserSettingsUser {
                username: "vip_user".to_string(),
                private: Some(false),
                name: Some("VIP User".to_string()),
                vip: Some(true),
                vip_ep: Some(false),
            },
            account: TraktUserSettingsAccount {
                timezone: Some("America/Los_Angeles".to_string()),
                date_format: None,
                time_24hr: None,
                cover_image: None,
            },
        };

        assert!(
            ApiClient::detect_vip_status(&settings),
            "VIP user should be detected as VIP"
        );
    }

    #[test]
    fn test_vip_detection_vip_ep_user() {
        use crate::trakt::models::{
            TraktUserSettings, TraktUserSettingsAccount, TraktUserSettingsUser,
        };

        let settings = TraktUserSettings {
            user: TraktUserSettingsUser {
                username: "vip_ep_user".to_string(),
                private: Some(false),
                name: Some("VIP EP User".to_string()),
                vip: Some(false),
                vip_ep: Some(true),
            },
            account: TraktUserSettingsAccount {
                timezone: Some("America/Los_Angeles".to_string()),
                date_format: None,
                time_24hr: None,
                cover_image: None,
            },
        };

        assert!(
            ApiClient::detect_vip_status(&settings),
            "VIP EP user should be detected as VIP"
        );
    }

    #[test]
    fn test_vip_detection_both_flags_set() {
        use crate::trakt::models::{
            TraktUserSettings, TraktUserSettingsAccount, TraktUserSettingsUser,
        };

        let settings = TraktUserSettings {
            user: TraktUserSettingsUser {
                username: "super_vip_user".to_string(),
                private: Some(false),
                name: Some("Super VIP User".to_string()),
                vip: Some(true),
                vip_ep: Some(true),
            },
            account: TraktUserSettingsAccount {
                timezone: Some("America/Los_Angeles".to_string()),
                date_format: None,
                time_24hr: None,
                cover_image: None,
            },
        };

        assert!(
            ApiClient::detect_vip_status(&settings),
            "User with both VIP flags should be detected as VIP"
        );
    }

    #[test]
    fn test_vip_detection_none_values() {
        use crate::trakt::models::{
            TraktUserSettings, TraktUserSettingsAccount, TraktUserSettingsUser,
        };

        let settings = TraktUserSettings {
            user: TraktUserSettingsUser {
                username: "unknown_user".to_string(),
                private: None,
                name: None,
                vip: None,
                vip_ep: None,
            },
            account: TraktUserSettingsAccount {
                timezone: None,
                date_format: None,
                time_24hr: None,
                cover_image: None,
            },
        };

        assert!(
            !ApiClient::detect_vip_status(&settings),
            "User with None VIP values should default to non-VIP"
        );
    }
}
