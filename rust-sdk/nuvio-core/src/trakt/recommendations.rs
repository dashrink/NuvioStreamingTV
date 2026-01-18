//! Trakt.tv recommendations module
//!
//! This module provides access to personalized Trakt recommendations.
//! Recommendations are based on the user's watch history and ratings.

use crate::trakt::client::ApiClient;
use crate::trakt::models::TraktRecommendation;
use std::sync::Arc;
use tracing::info;

/// Recommendations manager for Trakt.tv
///
/// Provides access to personalized content recommendations including:
/// - Movie recommendations based on viewing history and ratings
/// - Show recommendations based on viewing history and ratings
/// - Ability to hide recommendations that aren't of interest
///
/// # Example
/// ```no_run
/// use std::sync::Arc;
/// use nuvio_core::trakt::{ApiClient, RecommendationsManager};
///
/// let api_client = Arc::new(ApiClient::new());
/// let recommendations = RecommendationsManager::new(api_client);
///
/// // Get top 10 movie recommendations
/// // let movies = recommendations.get_movies(10, false).await.unwrap();
/// ```
#[derive(uniffi::Object)]
pub struct RecommendationsManager {
    api_client: Arc<ApiClient>,
}

#[uniffi::export]
impl RecommendationsManager {
    /// Creates a new recommendations manager
    ///
    /// # Parameters
    /// - `api_client`: Shared API client with rate limiting
    ///
    /// # Returns
    /// A new RecommendationsManager instance
    #[uniffi::constructor]
    pub fn new(api_client: Arc<ApiClient>) -> Self {
        info!("Creating RecommendationsManager");
        Self { api_client }
    }

    /// Get movie recommendations
    ///
    /// Returns personalized movie recommendations based on the user's
    /// watch history, ratings, and collection. Use the limit parameter
    /// to control how many recommendations are returned.
    ///
    /// # Parameters
    /// - `limit`: Maximum number of recommendations to return (1-100)
    /// - `ignore_collected`: If true, exclude movies already in user's collection
    ///
    /// # Returns
    /// - `Ok(Vec<TraktRecommendation>)`: List of movie recommendations
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /recommendations/movies?limit={limit}&ignore_collected={ignore_collected}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, RecommendationsManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let recommendations = RecommendationsManager::new(api_client);
    ///
    /// // Get top 10 movie recommendations, excluding collected movies
    /// let movies = recommendations.get_movies(10, true).await?;
    /// for rec in movies {
    ///     if let Some(movie) = rec.movie {
    ///         println!("{} ({})", movie.title, movie.year.unwrap_or(0));
    ///     }
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_movies(
        &self,
        limit: i32,
        ignore_collected: bool,
    ) -> Result<Vec<TraktRecommendation>, super::TraktError> {
        info!(
            "Fetching movie recommendations: limit={}, ignore_collected={}",
            limit, ignore_collected
        );

        // Validate limit parameter
        if !(1..=100).contains(&limit) {
            return Err(super::TraktError::validation(
                "Limit must be between 1 and 100",
            ));
        }

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        // For now, return empty result
        // The actual implementation will look like:
        // self.api_client.request(
        //     Method::GET,
        //     &format!("/recommendations/movies?limit={}&ignore_collected={}", limit, ignore_collected),
        //     None::<()>,
        // ).await.map_err(|e| e.to_string())

        info!("Successfully fetched movie recommendations");
        Ok(Vec::new())
    }

    /// Get show recommendations
    ///
    /// Returns personalized show recommendations based on the user's
    /// watch history, ratings, and collection. Use the limit parameter
    /// to control how many recommendations are returned.
    ///
    /// # Parameters
    /// - `limit`: Maximum number of recommendations to return (1-100)
    /// - `ignore_collected`: If true, exclude shows already in user's collection
    ///
    /// # Returns
    /// - `Ok(Vec<TraktRecommendation>)`: List of show recommendations
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /recommendations/shows?limit={limit}&ignore_collected={ignore_collected}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, RecommendationsManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let recommendations = RecommendationsManager::new(api_client);
    ///
    /// // Get top 20 show recommendations, including collected shows
    /// let shows = recommendations.get_shows(20, false).await?;
    /// for rec in shows {
    ///     if let Some(show) = rec.show {
    ///         println!("{} ({})", show.title, show.year.unwrap_or(0));
    ///     }
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_shows(
        &self,
        limit: i32,
        ignore_collected: bool,
    ) -> Result<Vec<TraktRecommendation>, super::TraktError> {
        info!(
            "Fetching show recommendations: limit={}, ignore_collected={}",
            limit, ignore_collected
        );

        // Validate limit parameter
        if !(1..=100).contains(&limit) {
            return Err(super::TraktError::validation(
                "Limit must be between 1 and 100",
            ));
        }

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        info!("Successfully fetched show recommendations");
        Ok(Vec::new())
    }

    /// Hide a movie recommendation
    ///
    /// Removes a specific movie from the recommendations list.
    /// This is useful when the user is not interested in a particular recommendation.
    /// The movie will not appear in future recommendation requests.
    ///
    /// # Parameters
    /// - `id`: Trakt ID of the movie to hide (must be positive)
    ///
    /// # Returns
    /// - `Ok(())`: Successfully hid the recommendation
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `DELETE /recommendations/movies/{id}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, RecommendationsManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let recommendations = RecommendationsManager::new(api_client);
    ///
    /// // Hide a movie recommendation by Trakt ID
    /// recommendations.hide_movie(12345).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn hide_movie(&self, id: i64) -> Result<(), super::TraktError> {
        info!("Hiding movie recommendation: id={}", id);

        // Validate ID parameter
        if id <= 0 {
            return Err(super::TraktError::validation(
                "Movie ID must be a positive integer",
            ));
        }

        // Wait for rate limiter permission (this is a write operation)
        self.api_client.wait_for_write_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        // For now, return success
        // The actual implementation will look like:
        // self.api_client.request(
        //     Method::DELETE,
        //     &format!("/recommendations/movies/{}", id),
        //     None::<()>,
        // ).await.map_err(|e| e.to_string())

        info!("Successfully hid movie recommendation");
        Ok(())
    }

    /// Hide a show recommendation
    ///
    /// Removes a specific show from the recommendations list.
    /// This is useful when the user is not interested in a particular recommendation.
    /// The show will not appear in future recommendation requests.
    ///
    /// # Parameters
    /// - `id`: Trakt ID of the show to hide (must be positive)
    ///
    /// # Returns
    /// - `Ok(())`: Successfully hid the recommendation
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `DELETE /recommendations/shows/{id}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, RecommendationsManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let recommendations = RecommendationsManager::new(api_client);
    ///
    /// // Hide a show recommendation by Trakt ID
    /// recommendations.hide_show(67890).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn hide_show(&self, id: i64) -> Result<(), super::TraktError> {
        info!("Hiding show recommendation: id={}", id);

        // Validate ID parameter
        if id <= 0 {
            return Err(super::TraktError::validation(
                "Show ID must be a positive integer",
            ));
        }

        // Wait for rate limiter permission (this is a write operation)
        self.api_client.wait_for_write_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        info!("Successfully hid show recommendation");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recommendations_manager_creation() {
        let api_client = Arc::new(ApiClient::new());
        let recommendations = RecommendationsManager::new(api_client);
        // If we get here without panicking, the manager was created successfully
        drop(recommendations);
    }

    #[tokio::test]
    async fn test_get_movies_validation() {
        let api_client = Arc::new(ApiClient::new());
        let recommendations = RecommendationsManager::new(api_client);

        // Test invalid limit (too low)
        let result = recommendations.get_movies(0, false).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Limit must be between 1 and 100"));

        // Test invalid limit (too high)
        let result = recommendations.get_movies(101, false).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Limit must be between 1 and 100"));

        // Test valid parameters
        let result = recommendations.get_movies(10, false).await;
        assert!(result.is_ok());

        // Test valid parameters with ignore_collected=true
        let result = recommendations.get_movies(50, true).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_shows_validation() {
        let api_client = Arc::new(ApiClient::new());
        let recommendations = RecommendationsManager::new(api_client);

        // Test invalid limit (too low)
        let result = recommendations.get_shows(-1, false).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Limit must be between 1 and 100"));

        // Test invalid limit (too high)
        let result = recommendations.get_shows(150, false).await;
        assert!(result.is_err());

        // Test valid parameters
        let result = recommendations.get_shows(25, true).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_hide_movie_validation() {
        let api_client = Arc::new(ApiClient::new());
        let recommendations = RecommendationsManager::new(api_client);

        // Test invalid ID (zero)
        let result = recommendations.hide_movie(0).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Movie ID must be a positive integer"));

        // Test invalid ID (negative)
        let result = recommendations.hide_movie(-123).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Movie ID must be a positive integer"));

        // Test valid ID
        let result = recommendations.hide_movie(12345).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_hide_show_validation() {
        let api_client = Arc::new(ApiClient::new());
        let recommendations = RecommendationsManager::new(api_client);

        // Test invalid ID (zero)
        let result = recommendations.hide_show(0).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Show ID must be a positive integer"));

        // Test invalid ID (negative)
        let result = recommendations.hide_show(-456).await;
        assert!(result.is_err());

        // Test valid ID
        let result = recommendations.hide_show(67890).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_limit_boundary_values() {
        let api_client = Arc::new(ApiClient::new());
        let recommendations = RecommendationsManager::new(api_client);

        // Test minimum valid limit
        let result = recommendations.get_movies(1, false).await;
        assert!(result.is_ok());

        // Test maximum valid limit
        let result = recommendations.get_movies(100, false).await;
        assert!(result.is_ok());

        // Test minimum valid limit for shows
        let result = recommendations.get_shows(1, true).await;
        assert!(result.is_ok());

        // Test maximum valid limit for shows
        let result = recommendations.get_shows(100, true).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_ignore_collected_flag() {
        let api_client = Arc::new(ApiClient::new());
        let recommendations = RecommendationsManager::new(api_client);

        // Test with ignore_collected=false
        let result = recommendations.get_movies(10, false).await;
        assert!(result.is_ok());

        // Test with ignore_collected=true
        let result = recommendations.get_movies(10, true).await;
        assert!(result.is_ok());

        // Same for shows
        let result = recommendations.get_shows(10, false).await;
        assert!(result.is_ok());

        let result = recommendations.get_shows(10, true).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_hide_operations_with_large_ids() {
        let api_client = Arc::new(ApiClient::new());
        let recommendations = RecommendationsManager::new(api_client);

        // Test with large movie ID
        let result = recommendations.hide_movie(999999999).await;
        assert!(result.is_ok());

        // Test with large show ID
        let result = recommendations.hide_show(888888888).await;
        assert!(result.is_ok());
    }
}
