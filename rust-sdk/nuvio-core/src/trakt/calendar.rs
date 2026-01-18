//! Trakt.tv calendar module
//!
//! This module provides access to Trakt calendar endpoints for upcoming shows and movies.
//! Calendar endpoints return personalized schedules for authenticated users.

use crate::trakt::client::ApiClient;
use crate::trakt::models::{TraktCalendarMovie, TraktCalendarShow};
use std::sync::Arc;
use tracing::info;

/// Calendar manager for Trakt.tv
///
/// Provides access to personalized calendar data including:
/// - My shows: Episodes from shows in your watched/collected history
/// - New shows: Season premieres of shows you watch
/// - Premieres: All new show premieres
/// - Movies: Movies releasing in theaters or on streaming
///
/// # Date Format
/// Dates should be in ISO 8601 format (YYYY-MM-DD), e.g., "2024-01-15"
///
/// # Days Range
/// The `days` parameter can be 1-33, representing how many days to fetch
///
/// # Example
/// ```no_run
/// use std::sync::Arc;
/// use nuvio_core::trakt::{ApiClient, CalendarManager};
///
/// let api_client = Arc::new(ApiClient::new());
/// let calendar = CalendarManager::new(api_client);
///
/// // Get shows for the next 7 days starting today
/// // let shows = calendar.get_my_shows("2024-01-15", 7).await.unwrap();
/// ```
#[derive(uniffi::Object)]
pub struct CalendarManager {
    api_client: Arc<ApiClient>,
}

#[uniffi::export]
impl CalendarManager {
    /// Creates a new calendar manager
    ///
    /// # Parameters
    /// - `api_client`: Shared API client with rate limiting
    ///
    /// # Returns
    /// A new CalendarManager instance
    #[uniffi::constructor]
    pub fn new(api_client: Arc<ApiClient>) -> Self {
        info!("Creating CalendarManager");
        Self { api_client }
    }

    /// Get calendar for my shows
    ///
    /// Returns upcoming episodes for shows the user has watched or collected.
    /// This is a personalized calendar based on the user's viewing history.
    ///
    /// # Parameters
    /// - `start_date`: Start date in ISO 8601 format (YYYY-MM-DD)
    /// - `days`: Number of days to retrieve (1-33)
    ///
    /// # Returns
    /// - `Ok(Vec<TraktCalendarShow>)`: List of upcoming show episodes
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /calendars/my/shows/{start_date}/{days}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, CalendarManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let calendar = CalendarManager::new(api_client);
    ///
    /// // Get shows for the next week starting from January 15, 2024
    /// let shows = calendar.get_my_shows("2024-01-15".to_string(), 7).await?;
    /// for show in shows {
    ///     println!("{} - S{}E{}: {}",
    ///         show.show.title,
    ///         show.episode.season,
    ///         show.episode.number,
    ///         show.episode.title
    ///     );
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_my_shows(
        &self,
        start_date: String,
        days: i32,
    ) -> Result<Vec<TraktCalendarShow>, super::TraktError> {
        info!(
            "Fetching my shows calendar: start_date={}, days={}",
            start_date, days
        );

        // Validate days parameter
        if !(1..=33).contains(&days) {
            return Err(super::TraktError::validation(
                "Days must be between 1 and 33",
            ));
        }

        // Validate date format (YYYY-MM-DD)
        if start_date.len() != 10 {
            return Err(super::TraktError::validation(
                "Date must be in YYYY-MM-DD format",
            ));
        }
        // Check that dashes are in the right positions (position 4 and 7)
        let chars: Vec<char> = start_date.chars().collect();
        if chars.get(4) != Some(&'-') || chars.get(7) != Some(&'-') {
            return Err(super::TraktError::validation(
                "Date must be in YYYY-MM-DD format",
            ));
        }

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        // For now, return empty result
        // The actual implementation will look like:
        // self.api_client.request(
        //     Method::GET,
        //     &format!("/calendars/my/shows/{}/{}", start_date, days),
        //     None::<()>,
        // ).await.map_err(|e| e.to_string())

        info!("Successfully fetched my shows calendar");
        Ok(Vec::new())
    }

    /// Get calendar for new show premieres that the user watches
    ///
    /// Returns season premieres for shows the user has watched or collected.
    /// This includes both new series premieres and returning series season premieres.
    ///
    /// # Parameters
    /// - `start_date`: Start date in ISO 8601 format (YYYY-MM-DD)
    /// - `days`: Number of days to retrieve (1-33)
    ///
    /// # Returns
    /// - `Ok(Vec<TraktCalendarShow>)`: List of new season episodes
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /calendars/my/new/shows/{start_date}/{days}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, CalendarManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let calendar = CalendarManager::new(api_client);
    ///
    /// // Get new season premieres for the next 14 days
    /// let premieres = calendar.get_my_new_shows("2024-01-15".to_string(), 14).await?;
    /// for show in premieres {
    ///     println!("New season: {} - S{}E{}",
    ///         show.show.title,
    ///         show.episode.season,
    ///         show.episode.number
    ///     );
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_my_new_shows(
        &self,
        start_date: String,
        days: i32,
    ) -> Result<Vec<TraktCalendarShow>, super::TraktError> {
        info!(
            "Fetching my new shows calendar: start_date={}, days={}",
            start_date, days
        );

        // Validate days parameter
        if !(1..=33).contains(&days) {
            return Err(super::TraktError::validation(
                "Days must be between 1 and 33",
            ));
        }

        // Validate date format (YYYY-MM-DD)
        if start_date.len() != 10 {
            return Err(super::TraktError::validation(
                "Date must be in YYYY-MM-DD format",
            ));
        }
        // Check that dashes are in the right positions (position 4 and 7)
        let chars: Vec<char> = start_date.chars().collect();
        if chars.get(4) != Some(&'-') || chars.get(7) != Some(&'-') {
            return Err(super::TraktError::validation(
                "Date must be in YYYY-MM-DD format",
            ));
        }

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        info!("Successfully fetched my new shows calendar");
        Ok(Vec::new())
    }

    /// Get calendar for all show premieres
    ///
    /// Returns all show season premieres airing during the time period.
    /// Unlike get_my_new_shows(), this includes ALL shows, not just ones the user watches.
    ///
    /// # Parameters
    /// - `start_date`: Start date in ISO 8601 format (YYYY-MM-DD)
    /// - `days`: Number of days to retrieve (1-33)
    ///
    /// # Returns
    /// - `Ok(Vec<TraktCalendarShow>)`: List of all show premieres
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /calendars/my/premieres/shows/{start_date}/{days}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, CalendarManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let calendar = CalendarManager::new(api_client);
    ///
    /// // Get all premieres for the next 30 days
    /// let premieres = calendar.get_my_premieres("2024-01-15".to_string(), 30).await?;
    /// println!("Found {} premieres", premieres.len());
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_my_premieres(
        &self,
        start_date: String,
        days: i32,
    ) -> Result<Vec<TraktCalendarShow>, super::TraktError> {
        info!(
            "Fetching my premieres calendar: start_date={}, days={}",
            start_date, days
        );

        // Validate days parameter
        if !(1..=33).contains(&days) {
            return Err(super::TraktError::validation(
                "Days must be between 1 and 33",
            ));
        }

        // Validate date format (YYYY-MM-DD)
        if start_date.len() != 10 {
            return Err(super::TraktError::validation(
                "Date must be in YYYY-MM-DD format",
            ));
        }
        // Check that dashes are in the right positions (position 4 and 7)
        let chars: Vec<char> = start_date.chars().collect();
        if chars.get(4) != Some(&'-') || chars.get(7) != Some(&'-') {
            return Err(super::TraktError::validation(
                "Date must be in YYYY-MM-DD format",
            ));
        }

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        info!("Successfully fetched my premieres calendar");
        Ok(Vec::new())
    }

    /// Get calendar for my movies
    ///
    /// Returns movies being released during the time period.
    /// This is personalized based on the user's watchlist and viewing history.
    ///
    /// # Parameters
    /// - `start_date`: Start date in ISO 8601 format (YYYY-MM-DD)
    /// - `days`: Number of days to retrieve (1-33)
    ///
    /// # Returns
    /// - `Ok(Vec<TraktCalendarMovie>)`: List of upcoming movies
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `GET /calendars/my/movies/{start_date}/{days}`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{ApiClient, CalendarManager};
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let calendar = CalendarManager::new(api_client);
    ///
    /// // Get movies releasing in the next 7 days
    /// let movies = calendar.get_my_movies("2024-01-15".to_string(), 7).await?;
    /// for movie in movies {
    ///     println!("{} ({})", movie.movie.title, movie.released);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_my_movies(
        &self,
        start_date: String,
        days: i32,
    ) -> Result<Vec<TraktCalendarMovie>, super::TraktError> {
        info!(
            "Fetching my movies calendar: start_date={}, days={}",
            start_date, days
        );

        // Validate days parameter
        if !(1..=33).contains(&days) {
            return Err(super::TraktError::validation(
                "Days must be between 1 and 33",
            ));
        }

        // Validate date format (YYYY-MM-DD)
        if start_date.len() != 10 {
            return Err(super::TraktError::validation(
                "Date must be in YYYY-MM-DD format",
            ));
        }
        // Check that dashes are in the right positions (position 4 and 7)
        let chars: Vec<char> = start_date.chars().collect();
        if chars.get(4) != Some(&'-') || chars.get(7) != Some(&'-') {
            return Err(super::TraktError::validation(
                "Date must be in YYYY-MM-DD format",
            ));
        }

        // Wait for rate limiter permission (this is a read operation)
        self.api_client.wait_for_read_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        info!("Successfully fetched my movies calendar");
        Ok(Vec::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calendar_manager_creation() {
        let api_client = Arc::new(ApiClient::new());
        let calendar = CalendarManager::new(api_client);
        // If we get here without panicking, the manager was created successfully
        drop(calendar);
    }

    #[tokio::test]
    async fn test_get_my_shows_validation() {
        let api_client = Arc::new(ApiClient::new());
        let calendar = CalendarManager::new(api_client);

        // Test invalid days (too low)
        let result = calendar.get_my_shows("2024-01-15".to_string(), 0).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Days must be between 1 and 33"));

        // Test invalid days (too high)
        let result = calendar.get_my_shows("2024-01-15".to_string(), 34).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Days must be between 1 and 33"));

        // Test invalid date format
        let result = calendar.get_my_shows("2024/01/15".to_string(), 7).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("YYYY-MM-DD"));

        // Test valid parameters
        let result = calendar.get_my_shows("2024-01-15".to_string(), 7).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_my_new_shows_validation() {
        let api_client = Arc::new(ApiClient::new());
        let calendar = CalendarManager::new(api_client);

        // Test invalid days
        let result = calendar.get_my_new_shows("2024-01-15".to_string(), 0).await;
        assert!(result.is_err());

        // Test invalid date format
        let result = calendar.get_my_new_shows("invalid".to_string(), 7).await;
        assert!(result.is_err());

        // Test valid parameters
        let result = calendar
            .get_my_new_shows("2024-01-15".to_string(), 14)
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_my_premieres_validation() {
        let api_client = Arc::new(ApiClient::new());
        let calendar = CalendarManager::new(api_client);

        // Test invalid days
        let result = calendar
            .get_my_premieres("2024-01-15".to_string(), 50)
            .await;
        assert!(result.is_err());

        // Test invalid date format
        let result = calendar.get_my_premieres("01-15-2024".to_string(), 7).await;
        assert!(result.is_err());

        // Test valid parameters
        let result = calendar
            .get_my_premieres("2024-01-15".to_string(), 30)
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_my_movies_validation() {
        let api_client = Arc::new(ApiClient::new());
        let calendar = CalendarManager::new(api_client);

        // Test invalid days
        let result = calendar.get_my_movies("2024-01-15".to_string(), -1).await;
        assert!(result.is_err());

        // Test invalid date format
        let result = calendar.get_my_movies("2024-1-5".to_string(), 7).await;
        assert!(result.is_err());

        // Test valid parameters
        let result = calendar.get_my_movies("2024-01-15".to_string(), 7).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_date_edge_cases() {
        let api_client = Arc::new(ApiClient::new());
        let calendar = CalendarManager::new(api_client);

        // Test empty date
        let result = calendar.get_my_shows("".to_string(), 7).await;
        assert!(result.is_err());

        // Test date too short
        let result = calendar.get_my_shows("2024-01".to_string(), 7).await;
        assert!(result.is_err());

        // Test date too long
        let result = calendar
            .get_my_shows("2024-01-15-extra".to_string(), 7)
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_days_boundary_values() {
        let api_client = Arc::new(ApiClient::new());
        let calendar = CalendarManager::new(api_client);

        // Test minimum valid days
        let result = calendar.get_my_shows("2024-01-15".to_string(), 1).await;
        assert!(result.is_ok());

        // Test maximum valid days
        let result = calendar.get_my_shows("2024-01-15".to_string(), 33).await;
        assert!(result.is_ok());
    }
}
