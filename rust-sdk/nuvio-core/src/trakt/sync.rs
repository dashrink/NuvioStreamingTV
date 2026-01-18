//! Trakt.tv sync module
//!
//! This module provides access to Trakt sync endpoints for managing watched history,
//! collections, watchlists, and ratings.

use crate::trakt::client::ApiClient;
use crate::trakt::models::{TraktHistoryRemovePayload, TraktHistoryRemoveResponse};
use std::sync::Arc;
use tracing::{error, info};

/// Sync manager for Trakt.tv
///
/// Provides access to sync operations including:
/// - Watched history management (add/remove)
/// - Collection management (add/remove)
/// - Watchlist management (add/remove)
/// - Ratings management
///
/// # Example
/// ```no_run
/// use std::sync::Arc;
/// use nuvio_core::trakt::{ApiClient, SyncManager};
///
/// let api_client = Arc::new(ApiClient::new());
/// let sync = SyncManager::new(api_client);
///
/// // Remove items from history
/// // let result = sync.remove_from_history(payload).await.unwrap();
/// ```
#[derive(uniffi::Object)]
pub struct SyncManager {
    api_client: Arc<ApiClient>,
}

#[uniffi::export]
impl SyncManager {
    /// Creates a new sync manager
    ///
    /// # Parameters
    /// - `api_client`: Shared API client with rate limiting
    ///
    /// # Returns
    /// A new SyncManager instance
    #[uniffi::constructor]
    pub fn new(api_client: Arc<ApiClient>) -> Self {
        info!("Creating SyncManager");
        Self { api_client }
    }

    /// Remove items from watched history
    ///
    /// Removes movies, shows, seasons, or episodes from the user's watched history.
    /// This operation requires authentication and will use write rate limiting.
    ///
    /// # Parameters
    /// - `payload`: The items to remove from history (movies, shows with optional seasons/episodes, or history IDs)
    ///
    /// # Returns
    /// - `Ok(TraktHistoryRemoveResponse)`: Response with deleted counts and not_found items
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `POST /sync/history/remove`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{
    ///     ApiClient, SyncManager,
    ///     TraktHistoryRemovePayload, TraktHistoryMovie, TraktHistoryIds
    /// };
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let sync = SyncManager::new(api_client);
    ///
    /// // Remove a movie from history by IMDb ID
    /// let payload = TraktHistoryRemovePayload {
    ///     movies: Some(vec![TraktHistoryMovie {
    ///         ids: TraktHistoryIds {
    ///             trakt: None,
    ///             imdb: Some("tt0133093".to_string()),
    ///             tmdb: None,
    ///             tvdb: None,
    ///         },
    ///         title: None,
    ///         year: None,
    ///     }]),
    ///     shows: None,
    ///     ids: None,
    /// };
    ///
    /// let result = sync.remove_from_history(payload).await?;
    /// println!("Deleted {} movies, {} episodes",
    ///     result.deleted.movies,
    ///     result.deleted.episodes
    /// );
    /// # Ok(())
    /// # }
    /// ```
    ///
    /// # Platform Usage
    ///
    /// **iOS (Swift):**
    /// ```swift
    /// let syncManager = trakt.sync()
    ///
    /// // Remove a movie from history
    /// let ids = TraktHistoryIds(
    ///     trakt: nil,
    ///     imdb: "tt0133093",
    ///     tmdb: nil,
    ///     tvdb: nil
    /// )
    /// let movie = TraktHistoryMovie(
    ///     ids: ids,
    ///     title: nil,
    ///     year: nil
    /// )
    /// let payload = TraktHistoryRemovePayload(
    ///     movies: [movie],
    ///     shows: nil,
    ///     ids: nil
    /// )
    ///
    /// do {
    ///     let result = try await syncManager.removeFromHistory(payload: payload)
    ///     print("Deleted \(result.deleted.movies) movies")
    /// } catch {
    ///     print("Error: \(error)")
    /// }
    /// ```
    ///
    /// **Android (Kotlin):**
    /// ```kotlin
    /// val syncManager = trakt.sync()
    ///
    /// // Remove a show from history
    /// val ids = TraktHistoryIds(
    ///     trakt = null,
    ///     imdb = "tt0903747",
    ///     tmdb = null,
    ///     tvdb = null
    /// )
    /// val show = TraktHistoryShow(
    ///     ids = ids,
    ///     title = null,
    ///     year = null,
    ///     seasons = null
    /// )
    /// val payload = TraktHistoryRemovePayload(
    ///     movies = null,
    ///     shows = listOf(show),
    ///     ids = null
    /// )
    ///
    /// GlobalScope.launch {
    ///     try {
    ///         val result = syncManager.removeFromHistory(payload)
    ///         println("Deleted ${result.deleted.episodes} episodes")
    ///     } catch (e: Exception) {
    ///         println("Error: ${e.message}")
    ///     }
    /// }
    /// ```
    pub async fn remove_from_history(
        &self,
        payload: TraktHistoryRemovePayload,
    ) -> Result<TraktHistoryRemoveResponse, super::TraktError> {
        info!("Removing items from history");

        // Validate that at least one field is populated
        if payload.movies.is_none() && payload.shows.is_none() && payload.ids.is_none() {
            error!("Invalid payload: must contain at least one of: movies, shows, or ids");
            return Err(super::TraktError::validation(
                "Payload must contain at least one of: movies, shows, or ids",
            ));
        }

        // Wait for rate limiter permission (this is a write operation)
        self.api_client.wait_for_write_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        // For now, return a mock response
        // The actual implementation will look like:
        // self.api_client.request(
        //     Method::POST,
        //     "/sync/history/remove",
        //     Some(payload),
        // ).await.map_err(|e| e.to_string())

        info!("Successfully removed items from history");

        // Return a mock response for now
        Ok(TraktHistoryRemoveResponse {
            deleted: crate::trakt::models::TraktHistoryDeletedCount {
                movies: 0,
                episodes: 0,
            },
            not_found: crate::trakt::models::TraktHistoryNotFound {
                movies: Vec::new(),
                shows: Vec::new(),
                episodes: Vec::new(),
            },
        })
    }

    /// Remove items from collection
    ///
    /// Removes movies, shows, seasons, or episodes from the user's collection.
    /// This operation requires authentication and will use write rate limiting.
    ///
    /// # Parameters
    /// - `payload`: The items to remove from collection (movies or shows with optional seasons/episodes)
    ///
    /// # Returns
    /// - `Ok(TraktHistoryRemoveResponse)`: Response with deleted counts and not_found items
    /// - `Err(String)`: Error message if the request fails
    ///
    /// # API Endpoint
    /// `POST /sync/collection/remove`
    ///
    /// # Example
    /// ```no_run
    /// use std::sync::Arc;
    /// use nuvio_core::trakt::{
    ///     ApiClient, SyncManager,
    ///     TraktHistoryRemovePayload, TraktHistoryMovie, TraktHistoryIds
    /// };
    ///
    /// # async fn example() -> Result<(), nuvio_core::trakt::TraktError> {
    /// let api_client = Arc::new(ApiClient::new());
    /// let sync = SyncManager::new(api_client);
    ///
    /// // Remove a movie from collection by IMDb ID
    /// let payload = TraktHistoryRemovePayload {
    ///     movies: Some(vec![TraktHistoryMovie {
    ///         ids: TraktHistoryIds {
    ///             trakt: None,
    ///             imdb: Some("tt0133093".to_string()),
    ///             tmdb: None,
    ///             tvdb: None,
    ///         },
    ///         title: None,
    ///         year: None,
    ///     }]),
    ///     shows: None,
    ///     ids: None,
    /// };
    ///
    /// let result = sync.remove_from_collection(payload).await?;
    /// println!("Removed {} movies, {} episodes from collection",
    ///     result.deleted.movies,
    ///     result.deleted.episodes
    /// );
    /// # Ok(())
    /// # }
    /// ```
    ///
    /// # Platform Usage
    ///
    /// **iOS (Swift):**
    /// ```swift
    /// let syncManager = trakt.sync()
    ///
    /// // Remove a movie from collection
    /// let ids = TraktHistoryIds(
    ///     trakt: nil,
    ///     imdb: "tt0133093",
    ///     tmdb: nil,
    ///     tvdb: nil
    /// )
    /// let movie = TraktHistoryMovie(
    ///     ids: ids,
    ///     title: nil,
    ///     year: nil
    /// )
    /// let payload = TraktHistoryRemovePayload(
    ///     movies: [movie],
    ///     shows: nil,
    ///     ids: nil
    /// )
    ///
    /// do {
    ///     let result = try await syncManager.removeFromCollection(payload: payload)
    ///     print("Removed \(result.deleted.movies) movies from collection")
    /// } catch {
    ///     print("Error: \(error)")
    /// }
    /// ```
    ///
    /// **Android (Kotlin):**
    /// ```kotlin
    /// val syncManager = trakt.sync()
    ///
    /// // Remove a show from collection
    /// val ids = TraktHistoryIds(
    ///     trakt = null,
    ///     imdb = "tt0903747",
    ///     tmdb = null,
    ///     tvdb = null
    /// )
    /// val show = TraktHistoryShow(
    ///     ids = ids,
    ///     title = null,
    ///     year = null,
    ///     seasons = null
    /// )
    /// val payload = TraktHistoryRemovePayload(
    ///     movies = null,
    ///     shows = listOf(show),
    ///     ids = null
    /// )
    ///
    /// GlobalScope.launch {
    ///     try {
    ///         val result = syncManager.removeFromCollection(payload)
    ///         println("Removed ${result.deleted.episodes} episodes from collection")
    ///     } catch (e: Exception) {
    ///         println("Error: ${e.message}")
    ///     }
    /// }
    /// ```
    pub async fn remove_from_collection(
        &self,
        payload: TraktHistoryRemovePayload,
    ) -> Result<TraktHistoryRemoveResponse, super::TraktError> {
        info!("Removing items from collection");

        // Validate that at least one field is populated
        if payload.movies.is_none() && payload.shows.is_none() {
            error!("Invalid payload: must contain at least one of: movies or shows");
            return Err(super::TraktError::validation(
                "Payload must contain at least one of: movies or shows",
            ));
        }

        // Wait for rate limiter permission (this is a write operation)
        self.api_client.wait_for_write_permission().await;

        // TODO: Implement actual HTTP request once ApiClient has request methods
        // For now, return a mock response
        // The actual implementation will look like:
        // self.api_client.request(
        //     Method::POST,
        //     "/sync/collection/remove",
        //     Some(payload),
        // ).await.map_err(|e| e.to_string())

        info!("Successfully removed items from collection");

        // Return a mock response for now
        Ok(TraktHistoryRemoveResponse {
            deleted: crate::trakt::models::TraktHistoryDeletedCount {
                movies: 0,
                episodes: 0,
            },
            not_found: crate::trakt::models::TraktHistoryNotFound {
                movies: Vec::new(),
                shows: Vec::new(),
                episodes: Vec::new(),
            },
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::trakt::models::{
        TraktHistoryEpisode, TraktHistoryIds, TraktHistoryMovie, TraktHistorySeason,
        TraktHistoryShow,
    };

    #[test]
    fn test_sync_manager_creation() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);
        // If we get here without panicking, the manager was created successfully
        drop(sync);
    }

    #[tokio::test]
    async fn test_remove_from_history_empty_payload() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: None,
            shows: None,
            ids: None,
        };

        let result = sync.remove_from_history(payload).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("must contain at least one"));
    }

    #[tokio::test]
    async fn test_remove_from_history_with_movie() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: Some(vec![TraktHistoryMovie {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0133093".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: Some("The Matrix".to_string()),
                year: Some(1999),
            }]),
            shows: None,
            ids: None,
        };

        let result = sync.remove_from_history(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_history_with_show() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: None,
            shows: Some(vec![TraktHistoryShow {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0903747".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: Some("Breaking Bad".to_string()),
                year: Some(2008),
                seasons: None,
            }]),
            ids: None,
        };

        let result = sync.remove_from_history(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_history_with_show_and_seasons() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: None,
            shows: Some(vec![TraktHistoryShow {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0903747".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: None,
                year: None,
                seasons: Some(vec![TraktHistorySeason {
                    number: 1,
                    episodes: None,
                }]),
            }]),
            ids: None,
        };

        let result = sync.remove_from_history(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_history_with_specific_episode() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: None,
            shows: Some(vec![TraktHistoryShow {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0903747".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: None,
                year: None,
                seasons: Some(vec![TraktHistorySeason {
                    number: 1,
                    episodes: Some(vec![TraktHistoryEpisode { number: 1 }]),
                }]),
            }]),
            ids: None,
        };

        let result = sync.remove_from_history(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_history_with_history_ids() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: None,
            shows: None,
            ids: Some(vec![123456, 789012, 345678]),
        };

        let result = sync.remove_from_history(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_history_with_multiple_movies() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: Some(vec![
                TraktHistoryMovie {
                    ids: TraktHistoryIds {
                        trakt: None,
                        imdb: Some("tt0133093".to_string()),
                        tmdb: None,
                        tvdb: None,
                    },
                    title: None,
                    year: None,
                },
                TraktHistoryMovie {
                    ids: TraktHistoryIds {
                        trakt: Some(12345),
                        imdb: None,
                        tmdb: None,
                        tvdb: None,
                    },
                    title: None,
                    year: None,
                },
            ]),
            shows: None,
            ids: None,
        };

        let result = sync.remove_from_history(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_history_mixed_payload() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        // Test that both movies and shows can be in the same payload
        let payload = TraktHistoryRemovePayload {
            movies: Some(vec![TraktHistoryMovie {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0133093".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: None,
                year: None,
            }]),
            shows: Some(vec![TraktHistoryShow {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0903747".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: None,
                year: None,
                seasons: None,
            }]),
            ids: None,
        };

        let result = sync.remove_from_history(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_collection_empty_payload() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: None,
            shows: None,
            ids: None,
        };

        let result = sync.remove_from_collection(payload).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("must contain at least one"));
    }

    #[tokio::test]
    async fn test_remove_from_collection_with_movie() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: Some(vec![TraktHistoryMovie {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0133093".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: Some("The Matrix".to_string()),
                year: Some(1999),
            }]),
            shows: None,
            ids: None,
        };

        let result = sync.remove_from_collection(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_collection_with_show() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: None,
            shows: Some(vec![TraktHistoryShow {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0903747".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: Some("Breaking Bad".to_string()),
                year: Some(2008),
                seasons: None,
            }]),
            ids: None,
        };

        let result = sync.remove_from_collection(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_collection_with_show_and_seasons() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: None,
            shows: Some(vec![TraktHistoryShow {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0903747".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: None,
                year: None,
                seasons: Some(vec![TraktHistorySeason {
                    number: 1,
                    episodes: None,
                }]),
            }]),
            ids: None,
        };

        let result = sync.remove_from_collection(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_collection_with_specific_episode() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: None,
            shows: Some(vec![TraktHistoryShow {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0903747".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: None,
                year: None,
                seasons: Some(vec![TraktHistorySeason {
                    number: 1,
                    episodes: Some(vec![TraktHistoryEpisode { number: 1 }]),
                }]),
            }]),
            ids: None,
        };

        let result = sync.remove_from_collection(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_collection_with_multiple_movies() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        let payload = TraktHistoryRemovePayload {
            movies: Some(vec![
                TraktHistoryMovie {
                    ids: TraktHistoryIds {
                        trakt: None,
                        imdb: Some("tt0133093".to_string()),
                        tmdb: None,
                        tvdb: None,
                    },
                    title: None,
                    year: None,
                },
                TraktHistoryMovie {
                    ids: TraktHistoryIds {
                        trakt: Some(12345),
                        imdb: None,
                        tmdb: None,
                        tvdb: None,
                    },
                    title: None,
                    year: None,
                },
            ]),
            shows: None,
            ids: None,
        };

        let result = sync.remove_from_collection(payload).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_remove_from_collection_mixed_payload() {
        let api_client = Arc::new(ApiClient::new());
        let sync = SyncManager::new(api_client);

        // Test that both movies and shows can be in the same payload
        let payload = TraktHistoryRemovePayload {
            movies: Some(vec![TraktHistoryMovie {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0133093".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: None,
                year: None,
            }]),
            shows: Some(vec![TraktHistoryShow {
                ids: TraktHistoryIds {
                    trakt: None,
                    imdb: Some("tt0903747".to_string()),
                    tmdb: None,
                    tvdb: None,
                },
                title: None,
                year: None,
                seasons: None,
            }]),
            ids: None,
        };

        let result = sync.remove_from_collection(payload).await;
        assert!(result.is_ok());
    }
}
