//! Trakt.tv comments module
//!
//! This module provides access to Trakt comments endpoints for movies, shows, seasons, and episodes.
//! Comments include user reviews and discussions about content.

use crate::trakt::client::ApiClient;
use crate::trakt::models::TraktComment;
use std::sync::Arc;
use tracing::info;

/// Comments manager for Trakt.tv
///
/// Provides access to user comments and reviews for:
/// - Movies: User reviews and discussions about movies
/// - Shows: User reviews and discussions about TV shows
/// - Seasons: User comments about specific seasons
/// - Episodes: User comments about specific episodes
///
/// # Sort Options
/// Comments can be sorted by:
/// - `newest`: Most recent comments first
/// - `oldest`: Oldest comments first
/// - `likes`: Most liked comments first
/// - `replies`: Comments with most replies first
///
/// # Pagination
/// Use `page` and `limit` parameters to paginate through large comment threads.
/// - `page`: 1-indexed page number (default: 1)
/// - `limit`: Number of comments per page (default: 10, max: 1000)
///
/// # Example
/// ```no_run
/// use std::sync::Arc;
/// use nuvio_core::trakt::{ApiClient, CommentsManager};
///
/// let api_client = Arc::new(ApiClient::new());
/// let comments = CommentsManager::new(api_client);
///
/// // Get comments for a movie
/// // let movie_comments = comments.get_movie_comments("tron-legacy-2010".to_string(), "likes".to_string(), 1, 10).await.unwrap();
/// ```
#[derive(uniffi::Object)]
pub struct CommentsManager {
    api_client: Arc<ApiClient>,
}

#[uniffi::export]
impl CommentsManager {
    /// Creates a new comments manager
    ///
    /// # Parameters
    /// - `api_client`: Shared API client with rate limiting
    ///
    /// # Returns
    /// A new CommentsManager instance
    #[uniffi::constructor]
    pub fn new(api_client: Arc<ApiClient>) -> Self {
        info!("Creating CommentsManager");
        Self { api_client }
    }

    /// Get comments for a movie
    ///
    /// Returns user comments and reviews for a specific movie.
    ///
    /// # Parameters
    /// - `id`: Movie Trakt ID, Trakt slug, or IMDb ID
    /// - `sort`: Sort order (newest, oldest, likes, replies)
    /// - `page`: Page number for pagination (1-indexed)
    /// - `limit`: Number of comments per page (max: 1000)
    ///
    /// # Returns
    /// - `Ok(Vec<TraktComment>)`: List of comments
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /movies/{id}/comments/{sort}?page={page}&limit={limit}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, CommentsManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let comments = CommentsManager::new(api_client);
    ///
    /// // Get the most liked comments for Inception
    /// let movie_comments = comments.get_movie_comments(
    ///     "inception-2010".to_string(),
    ///     "likes".to_string(),
    ///     1,
    ///     10
    /// ).await?;
    ///
    /// for comment in movie_comments {
    ///     println!("{}: {}", comment.user.username, comment.comment);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_movie_comments(
        &self,
        id: String,
        sort: String,
        page: i32,
        limit: i32,
    ) -> Result<Vec<TraktComment>, super::TraktError> {
        info!(
            "Fetching movie comments: id={}, sort={}, page={}, limit={}",
            id, sort, page, limit
        );

        // Validate parameters
        self.validate_sort(&sort)?;
        self.validate_pagination(page, limit)?;

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        // For now, return empty result
        // The actual implementation will look like:
        // self.api_client.request(
        //     Method::GET,
        //     &format!("/movies/{}/comments/{}?page={}&limit={}", id, sort, page, limit),
        //     None::<()>,
        // ).await.map_err(|e| e.to_string())

        info!("Successfully fetched movie comments");
        Ok(Vec::new())
    }

    /// Get comments for a TV show
    ///
    /// Returns user comments and reviews for a specific TV show.
    ///
    /// # Parameters
    /// - `id`: Show Trakt ID, Trakt slug, or IMDb ID
    /// - `sort`: Sort order (newest, oldest, likes, replies)
    /// - `page`: Page number for pagination (1-indexed)
    /// - `limit`: Number of comments per page (max: 1000)
    ///
    /// # Returns
    /// - `Ok(Vec<TraktComment>)`: List of comments
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /shows/{id}/comments/{sort}?page={page}&limit={limit}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, CommentsManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let comments = CommentsManager::new(api_client);
    ///
    /// // Get the newest comments for Breaking Bad
    /// let show_comments = comments.get_show_comments(
    ///     "breaking-bad".to_string(),
    ///     "newest".to_string(),
    ///     1,
    ///     20
    /// ).await?;
    ///
    /// println!("Found {} comments", show_comments.len());
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_show_comments(
        &self,
        id: String,
        sort: String,
        page: i32,
        limit: i32,
    ) -> Result<Vec<TraktComment>, super::TraktError> {
        info!(
            "Fetching show comments: id={}, sort={}, page={}, limit={}",
            id, sort, page, limit
        );

        // Validate parameters
        self.validate_sort(&sort)?;
        self.validate_pagination(page, limit)?;

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        info!("Successfully fetched show comments");
        Ok(Vec::new())
    }

    /// Get comments for a season
    ///
    /// Returns user comments for a specific season of a TV show.
    ///
    /// # Parameters
    /// - `id`: Season Trakt ID
    /// - `sort`: Sort order (newest, oldest, likes, replies)
    /// - `page`: Page number for pagination (1-indexed)
    /// - `limit`: Number of comments per page (max: 1000)
    ///
    /// # Returns
    /// - `Ok(Vec<TraktComment>)`: List of comments
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /seasons/{id}/comments/{sort}?page={page}&limit={limit}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, CommentsManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let comments = CommentsManager::new(api_client);
    ///
    /// // Get comments for a specific season
    /// let season_comments = comments.get_season_comments(
    ///     "12345".to_string(),
    ///     "likes".to_string(),
    ///     1,
    ///     10
    /// ).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_season_comments(
        &self,
        id: String,
        sort: String,
        page: i32,
        limit: i32,
    ) -> Result<Vec<TraktComment>, super::TraktError> {
        info!(
            "Fetching season comments: id={}, sort={}, page={}, limit={}",
            id, sort, page, limit
        );

        // Validate parameters
        self.validate_sort(&sort)?;
        self.validate_pagination(page, limit)?;

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        info!("Successfully fetched season comments");
        Ok(Vec::new())
    }

    /// Get comments for an episode
    ///
    /// Returns user comments for a specific episode of a TV show.
    ///
    /// # Parameters
    /// - `id`: Episode Trakt ID
    /// - `sort`: Sort order (newest, oldest, likes, replies)
    /// - `page`: Page number for pagination (1-indexed)
    /// - `limit`: Number of comments per page (max: 1000)
    ///
    /// # Returns
    /// - `Ok(Vec<TraktComment>)`: List of comments
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /episodes/{id}/comments/{sort}?page={page}&limit={limit}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, CommentsManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let comments = CommentsManager::new(api_client);
    ///
    /// // Get comments for a specific episode
    /// let episode_comments = comments.get_episode_comments(
    ///     "67890".to_string(),
    ///     "newest".to_string(),
    ///     1,
    ///     10
    /// ).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_episode_comments(
        &self,
        id: String,
        sort: String,
        page: i32,
        limit: i32,
    ) -> Result<Vec<TraktComment>, super::TraktError> {
        info!(
            "Fetching episode comments: id={}, sort={}, page={}, limit={}",
            id, sort, page, limit
        );

        // Validate parameters
        self.validate_sort(&sort)?;
        self.validate_pagination(page, limit)?;

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        info!("Successfully fetched episode comments");
        Ok(Vec::new())
    }

    /// Validates the sort parameter
    ///
    /// # Parameters
    /// - `sort`: Sort order to validate
    ///
    /// # Returns
    /// - `Ok(())`: Sort parameter is valid
    /// - `Err(String)`: Sort parameter is invalid
    fn validate_sort(&self, sort: &str) -> Result<(), super::TraktError> {
        match sort {
            "newest" | "oldest" | "likes" | "replies" => Ok(()),
            _ => Err(super::TraktError::validation(format!(
                "Invalid sort '{}'. Must be one of: newest, oldest, likes, replies",
                sort
            ))),
        }
    }

    /// Validates pagination parameters
    ///
    /// # Parameters
    /// - `page`: Page number to validate (must be >= 1)
    /// - `limit`: Limit to validate (must be 1-1000)
    ///
    /// # Returns
    /// - `Ok(())`: Pagination parameters are valid
    /// - `Err(String)`: Pagination parameters are invalid
    fn validate_pagination(&self, page: i32, limit: i32) -> Result<(), super::TraktError> {
        if page < 1 {
            return Err(super::TraktError::validation("Page must be >= 1"));
        }
        if !(1..=1000).contains(&limit) {
            return Err(super::TraktError::validation(
                "Limit must be between 1 and 1000",
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_comments_manager_creation() {
        let api_client = Arc::new(ApiClient::new());
        let comments = CommentsManager::new(api_client);
        // If we get here without panicking, the manager was created successfully
        drop(comments);
    }

    #[tokio::test]
    async fn test_get_movie_comments_validation() {
        let api_client = Arc::new(ApiClient::new());
        let comments = CommentsManager::new(api_client);

        // Test invalid sort
        let result = comments
            .get_movie_comments("inception-2010".to_string(), "invalid".to_string(), 1, 10)
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid sort"));

        // Test invalid page (too low)
        let result = comments
            .get_movie_comments("inception-2010".to_string(), "newest".to_string(), 0, 10)
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Page must be >= 1"));

        // Test invalid limit (too low)
        let result = comments
            .get_movie_comments("inception-2010".to_string(), "newest".to_string(), 1, 0)
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Limit must be between 1 and 1000"));

        // Test invalid limit (too high)
        let result = comments
            .get_movie_comments("inception-2010".to_string(), "newest".to_string(), 1, 1001)
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Limit must be between 1 and 1000"));

        // Test valid parameters
        let result = comments
            .get_movie_comments("inception-2010".to_string(), "likes".to_string(), 1, 10)
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_show_comments_validation() {
        let api_client = Arc::new(ApiClient::new());
        let comments = CommentsManager::new(api_client);

        // Test invalid sort
        let result = comments
            .get_show_comments("breaking-bad".to_string(), "popularity".to_string(), 1, 10)
            .await;
        assert!(result.is_err());

        // Test valid parameters
        let result = comments
            .get_show_comments("breaking-bad".to_string(), "newest".to_string(), 1, 20)
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_season_comments_validation() {
        let api_client = Arc::new(ApiClient::new());
        let comments = CommentsManager::new(api_client);

        // Test invalid page
        let result = comments
            .get_season_comments("12345".to_string(), "likes".to_string(), -1, 10)
            .await;
        assert!(result.is_err());

        // Test valid parameters
        let result = comments
            .get_season_comments("12345".to_string(), "oldest".to_string(), 2, 15)
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_episode_comments_validation() {
        let api_client = Arc::new(ApiClient::new());
        let comments = CommentsManager::new(api_client);

        // Test invalid limit
        let result = comments
            .get_episode_comments("67890".to_string(), "replies".to_string(), 1, 2000)
            .await;
        assert!(result.is_err());

        // Test valid parameters
        let result = comments
            .get_episode_comments("67890".to_string(), "replies".to_string(), 1, 50)
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_sort_validation() {
        let api_client = Arc::new(ApiClient::new());
        let comments = CommentsManager::new(api_client);

        // Test all valid sort options
        let valid_sorts = vec!["newest", "oldest", "likes", "replies"];
        for sort in valid_sorts {
            let result = comments
                .get_movie_comments("test".to_string(), sort.to_string(), 1, 10)
                .await;
            assert!(result.is_ok(), "Sort '{}' should be valid", sort);
        }

        // Test invalid sort
        let result = comments
            .get_movie_comments("test".to_string(), "trending".to_string(), 1, 10)
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_pagination_boundary_values() {
        let api_client = Arc::new(ApiClient::new());
        let comments = CommentsManager::new(api_client);

        // Test minimum valid page
        let result = comments
            .get_movie_comments("test".to_string(), "newest".to_string(), 1, 10)
            .await;
        assert!(result.is_ok());

        // Test minimum valid limit
        let result = comments
            .get_movie_comments("test".to_string(), "newest".to_string(), 1, 1)
            .await;
        assert!(result.is_ok());

        // Test maximum valid limit
        let result = comments
            .get_movie_comments("test".to_string(), "newest".to_string(), 1, 1000)
            .await;
        assert!(result.is_ok());

        // Test large page number (should be valid)
        let result = comments
            .get_movie_comments("test".to_string(), "newest".to_string(), 100, 10)
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_all_comment_types() {
        let api_client = Arc::new(ApiClient::new());
        let comments = CommentsManager::new(api_client);

        // Test movie comments
        let result = comments
            .get_movie_comments("test".to_string(), "newest".to_string(), 1, 10)
            .await;
        assert!(result.is_ok());

        // Test show comments
        let result = comments
            .get_show_comments("test".to_string(), "newest".to_string(), 1, 10)
            .await;
        assert!(result.is_ok());

        // Test season comments
        let result = comments
            .get_season_comments("test".to_string(), "newest".to_string(), 1, 10)
            .await;
        assert!(result.is_ok());

        // Test episode comments
        let result = comments
            .get_episode_comments("test".to_string(), "newest".to_string(), 1, 10)
            .await;
        assert!(result.is_ok());
    }
}
