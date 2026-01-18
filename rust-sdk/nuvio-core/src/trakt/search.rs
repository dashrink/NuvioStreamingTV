//! Trakt.tv search module
//!
//! This module provides text and ID-based search functionality for the Trakt.tv API.
//! Supports searching by query text, IMDb ID, and TMDB ID.

use crate::trakt::client::ApiClient;
use crate::trakt::models::TraktSearchResult;
use std::sync::Arc;
use tracing::info;

/// Search manager for Trakt.tv
///
/// Provides search functionality including:
/// - Text search across movies, shows, episodes, people, and lists
/// - Exact IMDb ID lookup
/// - TMDB ID search
///
/// # Search Types
/// Supported search types: `movie`, `show`, `episode`, `person`, `list`
///
/// # Example
/// ```no_run
/// use std::sync::Arc;
/// use nuvio_core::trakt::{ApiClient, SearchManager};
///
/// let api_client = Arc::new(ApiClient::new());
/// let search = SearchManager::new(api_client);
///
/// // Search for movies matching "inception"
/// // let results = search.search_text("movie", "inception").await.unwrap();
/// ```
#[derive(uniffi::Object)]
pub struct SearchManager {
    api_client: Arc<ApiClient>,
}

#[uniffi::export]
impl SearchManager {
    /// Creates a new search manager
    ///
    /// # Parameters
    /// - `api_client`: Shared API client with rate limiting
    ///
    /// # Returns
    /// A new SearchManager instance
    #[uniffi::constructor]
    pub fn new(api_client: Arc<ApiClient>) -> Self {
        info!("Creating SearchManager");
        Self { api_client }
    }

    /// Search by text query
    ///
    /// Search for content by text query. The search will match against
    /// titles, descriptions, and other metadata depending on the type.
    ///
    /// # Parameters
    /// - `search_type`: Type of content to search (movie, show, episode, person, list)
    /// - `query`: Search query text (must not be empty)
    ///
    /// # Returns
    /// - `Ok(Vec<TraktSearchResult>)`: List of search results with relevance scores
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /search/{type}?query={query}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, SearchManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let search = SearchManager::new(api_client);
    ///
    /// // Search for movies matching "inception"
    /// let results = search.search_text("movie".to_string(), "inception".to_string()).await?;
    /// for result in results {
    ///     if let Some(movie) = result.movie {
    ///         println!("{} (score: {})", movie.title, result.score);
    ///     }
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn search_text(
        &self,
        search_type: String,
        query: String,
    ) -> Result<Vec<TraktSearchResult>, super::TraktError> {
        info!("Searching by text: type={}, query={}", search_type, query);

        // Validate search type
        let valid_types = ["movie", "show", "episode", "person", "list"];
        if !valid_types.contains(&search_type.as_str()) {
            return Err(super::TraktError::validation(format!(
                "Invalid search type '{}'. Must be one of: movie, show, episode, person, list",
                search_type
            )));
        }

        // Validate query is not empty
        if query.trim().is_empty() {
            return Err(super::TraktError::validation(
                "Search query cannot be empty",
            ));
        }

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        // For now, return empty result
        // The actual implementation will look like:
        // self.api_client.request(
        //     Method::GET,
        //     &format!("/search/{}?query={}", search_type, urlencoding::encode(&query)),
        //     None::<()>,
        // ).await.map_err(|e| e.to_string())

        info!("Successfully completed text search");
        Ok(Vec::new())
    }

    /// Search by IMDb ID
    ///
    /// Lookup content by exact IMDb ID. This is useful for finding the
    /// Trakt equivalent of content when you have an IMDb identifier.
    ///
    /// # Parameters
    /// - `imdb_id`: IMDb ID (e.g., "tt0133093" for The Matrix)
    /// - `search_type`: Optional type filter (movie, show, episode). If empty, searches all types.
    ///
    /// # Returns
    /// - `Ok(Vec<TraktSearchResult>)`: List of matching items (typically 0 or 1)
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /search/imdb/{id}?type={type}` (type parameter is optional)
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, SearchManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let search = SearchManager::new(api_client);
    ///
    /// // Find movie by IMDb ID
    /// let results = search.search_by_imdb("tt0133093".to_string(), "movie".to_string()).await?;
    /// if let Some(result) = results.first() {
    ///     if let Some(movie) = &result.movie {
    ///         println!("Found: {}", movie.title);
    ///     }
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn search_by_imdb(
        &self,
        imdb_id: String,
        search_type: String,
    ) -> Result<Vec<TraktSearchResult>, super::TraktError> {
        info!(
            "Searching by IMDb ID: imdb_id={}, type={}",
            imdb_id, search_type
        );

        // Validate IMDb ID format (should start with "tt" and have digits)
        if !imdb_id.starts_with("tt") || imdb_id.len() < 3 {
            return Err(super::TraktError::validation(
                "IMDb ID must start with 'tt' followed by digits (e.g., 'tt0133093')",
            ));
        }

        // Validate search type if provided
        if !search_type.is_empty() {
            let valid_types = ["movie", "show", "episode"];
            if !valid_types.contains(&search_type.as_str()) {
                return Err(super::TraktError::validation(format!(
                    "Invalid search type '{}'. Must be one of: movie, show, episode (or empty for all)",
                    search_type
                )));
            }
        }

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        // For now, return empty result
        // The actual implementation will look like:
        // let endpoint = if search_type.is_empty() {
        //     format!("/search/imdb/{}", imdb_id)
        // } else {
        //     format!("/search/imdb/{}?type={}", imdb_id, search_type)
        // };
        // self.api_client.request(
        //     Method::GET,
        //     &endpoint,
        //     None::<()>,
        // ).await.map_err(|e| e.to_string())

        info!("Successfully completed IMDb ID search");
        Ok(Vec::new())
    }

    /// Search by TMDB ID
    ///
    /// Lookup content by TMDB (The Movie Database) ID. This is useful for
    /// finding the Trakt equivalent when you have a TMDB identifier.
    ///
    /// # Parameters
    /// - `tmdb_id`: TMDB ID (positive integer)
    /// - `search_type`: Type of content (movie or show)
    ///
    /// # Returns
    /// - `Ok(Vec<TraktSearchResult>)`: List of matching items (typically 0 or 1)
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /search/{type}?id_type=tmdb&id={id}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, SearchManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let search = SearchManager::new(api_client);
    ///
    /// // Find movie by TMDB ID
    /// let results = search.search_by_tmdb(603, "movie".to_string()).await?;
    /// if let Some(result) = results.first() {
    ///     if let Some(movie) = &result.movie {
    ///         println!("Found: {}", movie.title);
    ///     }
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn search_by_tmdb(
        &self,
        tmdb_id: i64,
        search_type: String,
    ) -> Result<Vec<TraktSearchResult>, super::TraktError> {
        info!(
            "Searching by TMDB ID: tmdb_id={}, type={}",
            tmdb_id, search_type
        );

        // Validate TMDB ID
        if tmdb_id <= 0 {
            return Err(super::TraktError::validation(
                "TMDB ID must be a positive integer",
            ));
        }

        // Validate search type (TMDB only supports movie and show)
        let valid_types = ["movie", "show"];
        if !valid_types.contains(&search_type.as_str()) {
            return Err(super::TraktError::validation(format!(
                "Invalid search type '{}'. Must be one of: movie, show",
                search_type
            )));
        }

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        // For now, return empty result
        // The actual implementation will look like:
        // self.api_client.request(
        //     Method::GET,
        //     &format!("/search/{}?id_type=tmdb&id={}", search_type, tmdb_id),
        //     None::<()>,
        // ).await.map_err(|e| e.to_string())

        info!("Successfully completed TMDB ID search");
        Ok(Vec::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search_manager_creation() {
        let api_client = Arc::new(ApiClient::new());
        let search = SearchManager::new(api_client);
        // If we get here without panicking, the manager was created successfully
        drop(search);
    }

    #[tokio::test]
    async fn test_search_text_validation() {
        let api_client = Arc::new(ApiClient::new());
        let search = SearchManager::new(api_client);

        // Test invalid search type
        let result = search
            .search_text("invalid".to_string(), "test".to_string())
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid search type"));

        // Test empty query
        let result = search
            .search_text("movie".to_string(), "".to_string())
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot be empty"));

        // Test whitespace-only query
        let result = search
            .search_text("movie".to_string(), "   ".to_string())
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot be empty"));

        // Test valid parameters
        let result = search
            .search_text("movie".to_string(), "inception".to_string())
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_search_text_all_types() {
        let api_client = Arc::new(ApiClient::new());
        let search = SearchManager::new(api_client);

        // Test all valid search types
        let valid_types = ["movie", "show", "episode", "person", "list"];
        for search_type in valid_types.iter() {
            let result = search
                .search_text(search_type.to_string(), "test".to_string())
                .await;
            assert!(result.is_ok(), "Failed for type: {}", search_type);
        }
    }

    #[tokio::test]
    async fn test_search_by_imdb_validation() {
        let api_client = Arc::new(ApiClient::new());
        let search = SearchManager::new(api_client);

        // Test invalid IMDb ID (missing "tt" prefix)
        let result = search
            .search_by_imdb("0133093".to_string(), "movie".to_string())
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("must start with 'tt'"));

        // Test invalid IMDb ID (too short)
        let result = search
            .search_by_imdb("tt".to_string(), "movie".to_string())
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("must start with 'tt'"));

        // Test invalid search type
        let result = search
            .search_by_imdb("tt0133093".to_string(), "person".to_string())
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid search type"));

        // Test valid IMDb ID with type
        let result = search
            .search_by_imdb("tt0133093".to_string(), "movie".to_string())
            .await;
        assert!(result.is_ok());

        // Test valid IMDb ID without type (empty string)
        let result = search
            .search_by_imdb("tt0133093".to_string(), "".to_string())
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_search_by_imdb_all_types() {
        let api_client = Arc::new(ApiClient::new());
        let search = SearchManager::new(api_client);

        // Test all valid search types for IMDb
        let valid_types = ["movie", "show", "episode", ""];
        for search_type in valid_types.iter() {
            let result = search
                .search_by_imdb("tt0133093".to_string(), search_type.to_string())
                .await;
            assert!(result.is_ok(), "Failed for type: '{}'", search_type);
        }
    }

    #[tokio::test]
    async fn test_search_by_tmdb_validation() {
        let api_client = Arc::new(ApiClient::new());
        let search = SearchManager::new(api_client);

        // Test invalid TMDB ID (zero)
        let result = search.search_by_tmdb(0, "movie".to_string()).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("TMDB ID must be a positive integer"));

        // Test invalid TMDB ID (negative)
        let result = search.search_by_tmdb(-123, "movie".to_string()).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("TMDB ID must be a positive integer"));

        // Test invalid search type
        let result = search.search_by_tmdb(603, "episode".to_string()).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid search type"));

        // Test valid TMDB ID with movie
        let result = search.search_by_tmdb(603, "movie".to_string()).await;
        assert!(result.is_ok());

        // Test valid TMDB ID with show
        let result = search.search_by_tmdb(1399, "show".to_string()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_search_by_tmdb_all_types() {
        let api_client = Arc::new(ApiClient::new());
        let search = SearchManager::new(api_client);

        // Test all valid search types for TMDB
        let valid_types = ["movie", "show"];
        for search_type in valid_types.iter() {
            let result = search.search_by_tmdb(12345, search_type.to_string()).await;
            assert!(result.is_ok(), "Failed for type: {}", search_type);
        }
    }

    #[tokio::test]
    async fn test_search_text_special_characters() {
        let api_client = Arc::new(ApiClient::new());
        let search = SearchManager::new(api_client);

        // Test query with special characters
        let result = search
            .search_text("movie".to_string(), "Star Wars: Episode IV".to_string())
            .await;
        assert!(result.is_ok());

        // Test query with unicode
        let result = search
            .search_text("movie".to_string(), "Amélie".to_string())
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_imdb_id_formats() {
        let api_client = Arc::new(ApiClient::new());
        let search = SearchManager::new(api_client);

        // Test various valid IMDb ID formats
        let valid_ids = [
            "tt0133093",   // Standard format
            "tt1234567",   // 7 digits
            "tt12345678",  // 8 digits
            "tt123456789", // 9 digits
        ];

        for imdb_id in valid_ids.iter() {
            let result = search
                .search_by_imdb(imdb_id.to_string(), "movie".to_string())
                .await;
            assert!(result.is_ok(), "Failed for IMDb ID: {}", imdb_id);
        }
    }

    #[tokio::test]
    async fn test_tmdb_id_boundary_values() {
        let api_client = Arc::new(ApiClient::new());
        let search = SearchManager::new(api_client);

        // Test minimum valid TMDB ID
        let result = search.search_by_tmdb(1, "movie".to_string()).await;
        assert!(result.is_ok());

        // Test large TMDB ID
        let result = search.search_by_tmdb(999999999, "movie".to_string()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_empty_type_for_imdb() {
        let api_client = Arc::new(ApiClient::new());
        let search = SearchManager::new(api_client);

        // Test that empty type is allowed for IMDb search (searches all types)
        let result = search
            .search_by_imdb("tt0133093".to_string(), "".to_string())
            .await;
        assert!(result.is_ok());
    }
}
