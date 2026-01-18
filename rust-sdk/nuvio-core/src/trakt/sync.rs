use crate::trakt::client::ApiClient;
use crate::trakt::error::TraktError;
use crate::trakt::models::{TraktWatchedItem, TraktWatchlistItem, TraktCollectionItem, TraktRatingItem, TraktIds, TraktPlaybackItem, TraktHistoryItem};
use std::sync::Arc;
use reqwest::Method;
use serde::Serialize;

#[derive(uniffi::Object)]
pub struct SyncManager {
    api_client: Arc<ApiClient>,
}

impl SyncManager {
    pub fn new(api_client: Arc<ApiClient>) -> Self {
        Self { api_client }
    }
}

#[uniffi::export]
impl SyncManager {

    pub async fn get_profile(&self) -> Result<crate::trakt::models::TraktUser, TraktError> {
        self.api_client.request(Method::GET, "/users/me?extended=full", None::<()>).await
    }

    pub async fn get_watched_movies(&self) -> Result<Vec<TraktWatchedItem>, TraktError> {
        self.api_client.request(Method::GET, "/sync/watched/movies", None::<()>).await
    }

    pub async fn get_watched_shows(&self) -> Result<Vec<TraktWatchedItem>, TraktError> {
        self.api_client.request(Method::GET, "/sync/watched/shows", None::<()>).await
    }

    pub async fn get_watchlist_movies(&self) -> Result<Vec<TraktWatchlistItem>, TraktError> {
        self.api_client.request(Method::GET, "/sync/watchlist/movies", None::<()>).await
    }

    pub async fn get_watchlist_shows(&self) -> Result<Vec<TraktWatchlistItem>, TraktError> {
        self.api_client.request(Method::GET, "/sync/watchlist/shows", None::<()>).await
    }

    pub async fn get_collection_movies(&self) -> Result<Vec<TraktCollectionItem>, TraktError> {
        self.api_client.request(Method::GET, "/sync/collection/movies", None::<()>).await
    }

    pub async fn get_collection_shows(&self) -> Result<Vec<TraktCollectionItem>, TraktError> {
        self.api_client.request(Method::GET, "/sync/collection/shows", None::<()>).await
    }

    pub async fn get_ratings(&self, item_type: Option<String>) -> Result<Vec<TraktRatingItem>, TraktError> {
        let endpoint = match item_type {
            Some(t) => format!("/sync/ratings/{}", t),
            None => "/sync/ratings".to_string(),
        };
        self.api_client.request(Method::GET, &endpoint, None::<()>).await
    }

    pub async fn get_playback_progress(&self, item_type: Option<String>) -> Result<Vec<TraktPlaybackItem>, TraktError> {
        let endpoint = match item_type {
            Some(t) => format!("/sync/playback/{}", t),
            None => "/sync/playback".to_string(),
        };
        self.api_client.request(Method::GET, &endpoint, None::<()>).await
    }

    pub async fn get_history(&self, item_type: Option<String>, id: Option<u64>, limit: Option<u32>) -> Result<Vec<TraktHistoryItem>, TraktError> {
        let mut endpoint = "/sync/history".to_string();
        if let Some(t) = item_type {
            endpoint.push_str(&format!("/{}", t));
            if let Some(i) = id {
                endpoint.push_str(&format!("/{}", i));
            }
        }
        if let Some(l) = limit {
            endpoint.push_str(&format!("?limit={}", l));
        }
        self.api_client.request(Method::GET, &endpoint, None::<()>).await
    }

    // Write operations
    pub async fn add_to_watchlist(&self, ids: TraktIds, item_type: String) -> Result<(), TraktError> {
        #[derive(Serialize)]
        struct Payload {
            movies: Option<Vec<Item>>,
            shows: Option<Vec<Item>>,
        }
        #[derive(Serialize)]
        struct Item {
            ids: TraktIds,
        }

        let payload = if item_type == "movie" {
            Payload { movies: Some(vec![Item { ids }]), shows: None }
        } else {
            Payload { movies: None, shows: Some(vec![Item { ids }]) }
        };

        self.api_client.request(Method::POST, "/sync/watchlist", Some(payload)).await
    }

    pub async fn remove_from_watchlist(&self, ids: TraktIds, item_type: String) -> Result<(), TraktError> {
        #[derive(Serialize)]
        struct Payload {
            movies: Option<Vec<Item>>,
            shows: Option<Vec<Item>>,
        }
        #[derive(Serialize)]
        struct Item {
            ids: TraktIds,
        }

        let payload = if item_type == "movie" {
            Payload { movies: Some(vec![Item { ids }]), shows: None }
        } else {
            Payload { movies: None, shows: Some(vec![Item { ids }]) }
        };

        self.api_client.request(Method::POST, "/sync/watchlist/remove", Some(payload)).await
    }

    pub async fn add_to_collection(&self, ids: TraktIds, item_type: String) -> Result<(), TraktError> {
        #[derive(Serialize)]
        struct Payload {
            movies: Option<Vec<Item>>,
            shows: Option<Vec<Item>>,
        }
        #[derive(Serialize)]
        struct Item {
            ids: TraktIds,
        }

        let payload = if item_type == "movie" {
            Payload { movies: Some(vec![Item { ids }]), shows: None }
        } else {
            Payload { movies: None, shows: Some(vec![Item { ids }]) }
        };

        self.api_client.request(Method::POST, "/sync/collection", Some(payload)).await
    }

    pub async fn add_rating(&self, ids: TraktIds, item_type: String, rating: i32) -> Result<(), TraktError> {
        #[derive(Serialize)]
        struct Payload {
            movies: Option<Vec<RatingItem>>,
            shows: Option<Vec<RatingItem>>,
        }
        #[derive(Serialize)]
        struct RatingItem {
            ids: TraktIds,
            rating: i32,
        }

        let payload = if item_type == "movie" {
            Payload { movies: Some(vec![RatingItem { ids, rating }]), shows: None }
        } else {
            Payload { movies: None, shows: Some(vec![RatingItem { ids, rating }]) }
        };

        self.api_client.request(Method::POST, "/sync/ratings", Some(payload)).await
    }

    pub async fn add_to_history_movie(&self, ids: TraktIds, watched_at: Option<String>) -> Result<(), TraktError> {
        #[derive(Serialize)]
        struct Payload {
            movies: Vec<HistoryItem>,
        }
        #[derive(Serialize)]
        struct HistoryItem {
            ids: TraktIds,
            watched_at: Option<String>,
        }

        let payload = Payload {
            movies: vec![HistoryItem { ids, watched_at }],
        };

        self.api_client.request(Method::POST, "/sync/history", Some(payload)).await
    }

    pub async fn add_to_history_episode(&self, show_ids: TraktIds, season: i32, episode: i32, watched_at: Option<String>) -> Result<(), TraktError> {
        #[derive(Serialize)]
        struct Payload {
            shows: Vec<ShowItem>,
        }
        #[derive(Serialize)]
        struct ShowItem {
            ids: TraktIds,
            seasons: Vec<SeasonItem>,
        }
        #[derive(Serialize)]
        struct SeasonItem {
            number: i32,
            episodes: Vec<EpisodeItem>,
        }
        #[derive(Serialize)]
        struct EpisodeItem {
            number: i32,
            watched_at: Option<String>,
        }

        let payload = Payload {
            shows: vec![ShowItem {
                ids: show_ids,
                seasons: vec![SeasonItem {
                    number: season,
                    episodes: vec![EpisodeItem {
                        number: episode,
                        watched_at,
                    }],
                }],
            }],
        };

        self.api_client.request(Method::POST, "/sync/history", Some(payload)).await
    }

    pub async fn remove_from_history(&self, ids: TraktIds, item_type: String) -> Result<(), TraktError> {
        #[derive(Serialize)]
        struct Payload {
            movies: Option<Vec<Item>>,
            shows: Option<Vec<Item>>,
            episodes: Option<Vec<Item>>,
        }
        #[derive(Serialize)]
        struct Item {
            ids: TraktIds,
        }

        // Note: Removing episodes needs different payload if by ID or by Show+Season+Episode
        // This simple version assumes removing by ID.
        let payload = match item_type.as_str() {
            "movie" => Payload { movies: Some(vec![Item { ids }]), shows: None, episodes: None },
            "show" => Payload { movies: None, shows: Some(vec![Item { ids }]), episodes: None },
            "episode" => Payload { movies: None, shows: None, episodes: Some(vec![Item { ids }]) },
            _ => return Err(TraktError::Generic("Invalid item type".to_string())),
        };

        self.api_client.request(Method::POST, "/sync/history/remove", Some(payload)).await
    }
}
