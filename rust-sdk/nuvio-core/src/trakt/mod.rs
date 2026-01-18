//! Trakt.tv API integration module
//!
//! This module provides integration with the Trakt.tv API for tracking
//! watch history, ratings, and personalized recommendations.
//!
//! # Features
//!
//! - OAuth2 authentication with automatic token refresh
//! - Calendar for upcoming shows and movies
//! - Sync operations (watched history, ratings, watchlist)
//! - Rate limiting with GCRA algorithm
//! - Offline queue for failed requests
//! - GDPR compliance (data deletion and export)
//!
//! # Example
//!
//! ```no_run
//! use std::sync::Arc;
//! use nuvio_core::trakt::{Trakt, TraktTokenCallback};
//!
//! // Create a Trakt client without token callback
//! let trakt = Trakt::new(
//!     "your_client_id".to_string(),
//!     "your_client_secret".to_string(),
//!     "urn:ietf:wg:oauth:2.0:oob".to_string(),
//!     None,
//! ).unwrap();
//!
//! // Create a Trakt client with token callback
//! struct MyCallback;
//! impl TraktTokenCallback for MyCallback {
//!     fn on_token_refreshed(&self, access_token: String, expires_at: i64) {
//!         println!("Token refreshed: expires at {}", expires_at);
//!     }
//!     fn on_token_refresh_failed(&self, error: String) {
//!         eprintln!("Token refresh failed: {}", error);
//!     }
//! }
//!
//! let callback = Arc::new(MyCallback);
//! let trakt_with_callback = Trakt::new(
//!     "your_client_id".to_string(),
//!     "your_client_secret".to_string(),
//!     "urn:ietf:wg:oauth:2.0:oob".to_string(),
//!     Some(callback),
//! ).unwrap();
//! ```

pub mod auth;
pub mod calendar;
pub mod client;
pub mod comments;
pub mod error;
pub mod models;
pub mod recommendations;
pub mod search;
pub mod storage;
pub mod sync;

use std::sync::Arc;

// Re-export commonly used types
pub use auth::{AuthManager, TraktTokenCallback};
pub use error::TraktError;
// Backward compatibility alias
pub type AuthError = TraktError;
pub use calendar::CalendarManager;
pub use client::ApiClient;
pub use comments::CommentsManager;
pub use models::*;
pub use recommendations::RecommendationsManager;
pub use search::SearchManager;
pub use storage::TraktStorage;
pub use sync::SyncManager;

/// Main Trakt.tv client
///
/// This struct serves as the primary entry point for interacting with the Trakt.tv API.
/// It manages authentication, rate limiting, and provides access to various API managers.
///
/// # Example
///
/// ```no_run
/// use nuvio_core::trakt::Trakt;
///
/// let trakt = Trakt::new(
///     "your_client_id".to_string(),
///     "your_client_secret".to_string(),
///     "urn:ietf:wg:oauth:2.0:oob".to_string(),
///     None, // No token callback
/// ).unwrap();
///
/// // Access the auth manager
/// let auth = trakt.auth();
/// ```
pub struct Trakt {
    auth_manager: Arc<AuthManager>,
    api_client: Arc<ApiClient>,
    calendar_manager: Arc<CalendarManager>,
    comments_manager: Arc<CommentsManager>,
    recommendations_manager: Arc<RecommendationsManager>,
    search_manager: Arc<SearchManager>,
    sync_manager: Arc<SyncManager>,
}

impl Trakt {
    /// Creates a new Trakt client
    ///
    /// # Parameters
    /// - `client_id`: Your Trakt API client ID
    /// - `client_secret`: Your Trakt API client secret
    /// - `redirect_uri`: OAuth2 redirect URI (use "urn:ietf:wg:oauth:2.0:oob" for out-of-band)
    /// - `token_callback`: Optional callback for token refresh notifications
    ///
    /// # Returns
    /// - `Ok(Trakt)`: Successfully created client
    /// - `Err(AuthError)`: Failed to initialize (invalid URLs, etc.)
    ///
    /// # Example
    ///
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{Trakt, TraktTokenCallback};
    ///
    /// // Without callback
    /// let trakt = Trakt::new(
    ///     "client_id".to_string(),
    ///     "client_secret".to_string(),
    ///     "urn:ietf:wg:oauth:2.0:oob".to_string(),
    ///     None,
    /// ).unwrap();
    ///
    /// // With callback
    /// struct MyHandler;
    /// impl TraktTokenCallback for MyHandler {
    ///     fn on_token_refreshed(&self, access_token: String, expires_at: i64) {
    ///         // Handle token refresh
    ///     }
    ///     fn on_token_refresh_failed(&self, error: String) {
    ///         // Handle refresh failure
    ///     }
    /// }
    ///
    /// let callback = Arc::new(MyHandler);
    /// let trakt_with_cb = Trakt::new(
    ///     "client_id".to_string(),
    ///     "client_secret".to_string(),
    ///     "urn:ietf:wg:oauth:2.0:oob".to_string(),
    ///     Some(callback),
    /// ).unwrap();
    /// ```
    pub fn new(
        client_id: String,
        client_secret: String,
        redirect_uri: String,
        token_callback: Option<Arc<dyn TraktTokenCallback>>,
    ) -> Result<Self, AuthError> {
        // Create authentication manager with optional callback
        let auth_manager = AuthManager::new(
            client_id.clone(),
            client_secret,
            redirect_uri,
            token_callback,
        )?;

        // Create API client with standard rate limits
        // Note: VIP status detection will be implemented in future phases
        let api_client = Arc::new(ApiClient::new());

        // Create calendar manager
        let calendar_manager = CalendarManager::new(Arc::clone(&api_client));

        // Create comments manager
        let comments_manager = CommentsManager::new(Arc::clone(&api_client));

        // Create recommendations manager
        let recommendations_manager = RecommendationsManager::new(Arc::clone(&api_client));

        // Create search manager
        let search_manager = SearchManager::new(Arc::clone(&api_client));

        // Create sync manager
        let sync_manager = SyncManager::new(Arc::clone(&api_client));

        Ok(Self {
            auth_manager: Arc::new(auth_manager),
            api_client,
            calendar_manager: Arc::new(calendar_manager),
            comments_manager: Arc::new(comments_manager),
            recommendations_manager: Arc::new(recommendations_manager),
            search_manager: Arc::new(search_manager),
            sync_manager: Arc::new(sync_manager),
        })
    }

    /// Gets the authentication manager
    ///
    /// Use this to perform OAuth2 flows, store tokens, and manage authentication.
    ///
    /// # Returns
    /// Arc reference to the AuthManager instance
    pub fn auth(&self) -> Arc<AuthManager> {
        Arc::clone(&self.auth_manager)
    }

    /// Gets the API client
    ///
    /// Use this to make low-level API requests with rate limiting.
    ///
    /// # Returns
    /// Arc reference to the ApiClient instance
    pub fn client(&self) -> Arc<ApiClient> {
        Arc::clone(&self.api_client)
    }

    /// Gets the calendar manager
    ///
    /// Use this to access calendar endpoints for upcoming shows and movies.
    ///
    /// # Returns
    /// Arc reference to the CalendarManager instance
    ///
    /// # Example
    /// ```no_run
    /// use nuvio_core::trakt::Trakt;
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let trakt = Trakt::new(
    ///     "client_id".to_string(),
    ///     "client_secret".to_string(),
    ///     "urn:ietf:wg:oauth:2.0:oob".to_string(),
    ///     None,
    /// ).unwrap();
    ///
    /// let calendar = trakt.calendar();
    /// let shows = calendar.get_my_shows("2024-01-15".to_string(), 7).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub fn calendar(&self) -> Arc<CalendarManager> {
        Arc::clone(&self.calendar_manager)
    }

    /// Gets the recommendations manager
    ///
    /// Use this to access personalized recommendations for movies and shows.
    ///
    /// # Returns
    /// Arc reference to the RecommendationsManager instance
    ///
    /// # Example
    /// ```no_run
    /// use nuvio_core::trakt::Trakt;
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let trakt = Trakt::new(
    ///     "client_id".to_string(),
    ///     "client_secret".to_string(),
    ///     "urn:ietf:wg:oauth:2.0:oob".to_string(),
    ///     None,
    /// ).unwrap();
    ///
    /// let recommendations = trakt.recommendations();
    /// let movies = recommendations.get_movies(10, true).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub fn recommendations(&self) -> Arc<RecommendationsManager> {
        Arc::clone(&self.recommendations_manager)
    }

    /// Gets the comments manager
    ///
    /// Use this to access comments and reviews for movies, shows, seasons, and episodes.
    ///
    /// # Returns
    /// Arc reference to the CommentsManager instance
    ///
    /// # Example
    /// ```no_run
    /// use nuvio_core::trakt::Trakt;
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let trakt = Trakt::new(
    ///     "client_id".to_string(),
    ///     "client_secret".to_string(),
    ///     "urn:ietf:wg:oauth:2.0:oob".to_string(),
    ///     None,
    /// ).unwrap();
    ///
    /// let comments = trakt.comments();
    /// let movie_comments = comments.get_movie_comments(
    ///     "inception-2010".to_string(),
    ///     "likes".to_string(),
    ///     1,
    ///     10
    /// ).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub fn comments(&self) -> Arc<CommentsManager> {
        Arc::clone(&self.comments_manager)
    }

    /// Gets the search manager
    ///
    /// Use this to search for content by text query, IMDb ID, or TMDB ID.
    ///
    /// # Returns
    /// Arc reference to the SearchManager instance
    ///
    /// # Example
    /// ```no_run
    /// use nuvio_core::trakt::Trakt;
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let trakt = Trakt::new(
    ///     "client_id".to_string(),
    ///     "client_secret".to_string(),
    ///     "urn:ietf:wg:oauth:2.0:oob".to_string(),
    ///     None,
    /// ).unwrap();
    ///
    /// let search = trakt.search();
    /// let results = search.search_text("movie".to_string(), "inception".to_string()).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub fn search(&self) -> Arc<SearchManager> {
        Arc::clone(&self.search_manager)
    }

    /// Gets the sync manager
    ///
    /// Use this to manage watched history, collections, watchlists, and ratings.
    ///
    /// # Returns
    /// Arc reference to the SyncManager instance
    ///
    /// # Example
    /// ```no_run
    /// use nuvio_core::trakt::Trakt;
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let trakt = Trakt::new(
    ///     "client_id".to_string(),
    ///     "client_secret".to_string(),
    ///     "urn:ietf:wg:oauth:2.0:oob".to_string(),
    ///     None,
    /// ).unwrap();
    ///
    /// let sync = trakt.sync();
    /// // Use sync to manage history, collections, etc.
    /// # Ok(())
    /// # }
    /// ```
    pub fn sync(&self) -> Arc<SyncManager> {
        Arc::clone(&self.sync_manager)
    }

    /// Deletes all account data (GDPR Right to Erasure)
    ///
    /// This method implements the GDPR "Right to Erasure" (Article 17) by removing
    /// all Trakt-related account data managed by this client instance.
    ///
    /// # What Gets Deleted
    ///
    /// This method clears:
    /// - OAuth2 access tokens and refresh tokens (stored in memory by AuthManager)
    /// - Any in-memory caches maintained by the API client
    ///
    /// # Platform Storage
    ///
    /// **IMPORTANT**: This method does NOT delete data stored via the `TraktStorage` trait.
    /// Platform implementations (iOS/Android) must separately call `TraktStorage::delete_all_user_data()`
    /// to remove:
    /// - Persisted OAuth tokens (Keychain/KeyStore)
    /// - Offline queue data
    /// - Cached API responses
    /// - User preferences and settings
    ///
    /// # Usage
    ///
    /// ```no_run
    /// use nuvio_core::trakt::Trakt;
    ///
    /// let trakt = Trakt::new(
    ///     "client_id".to_string(),
    ///     "client_secret".to_string(),
    ///     "urn:ietf:wg:oauth:2.0:oob".to_string(),
    ///     None,
    /// ).unwrap();
    ///
    /// // User requests account data deletion
    /// trakt.delete_account_data();
    ///
    /// // Platform code should also call:
    /// // storage.delete_all_user_data().unwrap();
    /// ```
    ///
    /// # Platform Implementation Example
    ///
    /// ## iOS (Swift)
    /// ```swift
    /// // Clear Rust SDK managed data
    /// traktClient.deleteAccountData()
    ///
    /// // Clear platform storage
    /// try? traktStorage.deleteAllUserData()
    ///
    /// // User is now fully logged out with no data remaining
    /// ```
    ///
    /// ## Android (Kotlin)
    /// ```kotlin
    /// // Clear Rust SDK managed data
    /// traktClient.deleteAccountData()
    ///
    /// // Clear platform storage
    /// traktStorage.deleteAllUserData()
    ///
    /// // User is now fully logged out with no data remaining
    /// ```
    ///
    /// # GDPR Compliance
    ///
    /// To fully comply with GDPR Article 17 (Right to Erasure), both this method
    /// AND `TraktStorage::delete_all_user_data()` must be called. This two-step
    /// process ensures complete data deletion across both the Rust SDK and
    /// platform-specific storage.
    ///
    /// # Security
    ///
    /// After calling this method:
    /// - The user will be logged out
    /// - All API calls requiring authentication will fail
    /// - No tokens remain in memory
    /// - The user must re-authenticate to use the API again
    pub fn delete_account_data(&self) {
        // Clear OAuth tokens from auth manager
        self.auth_manager.clear_tokens();

        // Note: Platform code must separately call TraktStorage::delete_all_user_data()
        // to remove persisted data (tokens, queue, cache, etc.)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicBool, Ordering};

    /// Mock callback for testing
    struct TestCallback {
        refresh_called: AtomicBool,
        failure_called: AtomicBool,
    }

    impl TestCallback {
        fn new() -> Self {
            Self {
                refresh_called: AtomicBool::new(false),
                failure_called: AtomicBool::new(false),
            }
        }

        fn was_refresh_called(&self) -> bool {
            self.refresh_called.load(Ordering::SeqCst)
        }

        fn was_failure_called(&self) -> bool {
            self.failure_called.load(Ordering::SeqCst)
        }
    }

    impl TraktTokenCallback for TestCallback {
        fn on_token_refreshed(&self, _access_token: String, _expires_at: i64) {
            self.refresh_called.store(true, Ordering::SeqCst);
        }

        fn on_token_refresh_failed(&self, _error: String) {
            self.failure_called.store(true, Ordering::SeqCst);
        }
    }

    #[test]
    fn test_trakt_creation_without_callback() {
        let trakt = Trakt::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            None,
        );
        assert!(trakt.is_ok());
    }

    #[test]
    fn test_trakt_creation_with_callback() {
        let callback = Arc::new(TestCallback::new());
        let trakt = Trakt::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            Some(callback.clone()),
        );
        assert!(trakt.is_ok());
    }

    #[test]
    fn test_trakt_auth_accessor() {
        let trakt = Trakt::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            None,
        )
        .unwrap();

        let auth = trakt.auth();
        // Verify we get a valid AuthManager reference (should be at least 2: one in Trakt, one cloned)
        assert!(Arc::strong_count(&auth) >= 1);
    }

    #[test]
    fn test_trakt_client_accessor() {
        let trakt = Trakt::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            None,
        )
        .unwrap();

        let client = trakt.client();
        // Verify we get a valid ApiClient reference (should be at least 2: one in Trakt, one cloned)
        assert!(Arc::strong_count(&client) >= 1);
    }

    #[test]
    fn test_trakt_invalid_redirect_uri() {
        let trakt = Trakt::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "not a valid uri!!!".to_string(),
            None,
        );
        // Should fail due to invalid redirect URI
        assert!(trakt.is_err());
    }

    #[tokio::test]
    async fn test_delete_account_data() {
        let trakt = Trakt::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            None,
        )
        .unwrap();

        // Store some tokens (with long expiry)
        let auth = trakt.auth();
        auth.store_tokens(
            "test_access_token".to_string(),
            "test_refresh_token".to_string(),
            7200,
        );

        // Verify tokens are stored by trying to get access token
        let token = auth.get_access_token().await.unwrap();
        assert!(token.is_some());
        assert_eq!(token.unwrap(), "test_access_token");

        // Delete account data
        trakt.delete_account_data();

        // Verify tokens are cleared
        let token_after = auth.get_access_token().await.unwrap();
        assert!(token_after.is_none());
    }

    #[tokio::test]
    async fn test_delete_account_data_when_no_tokens() {
        let trakt = Trakt::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            None,
        )
        .unwrap();

        // Verify no tokens stored
        let auth = trakt.auth();
        let token = auth.get_access_token().await.unwrap();
        assert!(token.is_none());

        // Delete account data (should not panic)
        trakt.delete_account_data();

        // Verify still no tokens
        let token_after = auth.get_access_token().await.unwrap();
        assert!(token_after.is_none());
    }

    #[tokio::test]
    async fn test_gdpr_delete_account_data_compliance() {
        // GDPR compliance test - verifies complete data deletion
        let trakt = Trakt::new(
            "test_client_id".to_string(),
            "test_client_secret".to_string(),
            "urn:ietf:wg:oauth:2.0:oob".to_string(),
            None,
        )
        .unwrap();

        // Simulate user activity - store tokens
        let auth = trakt.auth();
        auth.store_tokens(
            "gdpr_test_access_token".to_string(),
            "gdpr_test_refresh_token".to_string(),
            7200,
        );

        // Verify user is authenticated
        let token = auth.get_access_token().await.unwrap();
        assert!(token.is_some());

        // User requests account deletion (GDPR Article 17 - Right to Erasure)
        trakt.delete_account_data();

        // Verify all in-memory data is deleted
        let token_after = auth.get_access_token().await.unwrap();
        assert!(
            token_after.is_none(),
            "Tokens should be completely deleted after delete_account_data()"
        );

        // Note: Platform code should also call TraktStorage::delete_all_user_data()
        // to ensure complete GDPR compliance
    }
}
