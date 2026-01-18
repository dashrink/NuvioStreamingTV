use crate::trakt::client::ApiClient;
use crate::trakt::error::TraktError;
use crate::trakt::models::{TraktScrobblePayload, TraktScrobbleResponse, TraktIds, TraktMoviePayload, TraktEpisodePayload};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;
use chrono::Utc;
use reqwest::Method;

#[derive(uniffi::Object)]
pub struct ScrobbleManager {
    api_client: Arc<ApiClient>,
    scrobbled_items: Arc<Mutex<HashMap<String, i64>>>,
    expiry_ms: i64,
    completion_threshold: f64,
}

impl ScrobbleManager {
    pub fn new(api_client: Arc<ApiClient>) -> Self {
        Self {
            api_client,
            scrobbled_items: Arc::new(Mutex::new(HashMap::new())),
            expiry_ms: 46 * 60 * 1000,
            completion_threshold: 80.0,
        }
    }
}

#[uniffi::export]
impl ScrobbleManager {

    pub async fn start(
        &self,
        movie_ids: Option<TraktIds>,
        episode_ids: Option<TraktIds>,
        season: Option<i32>,
        number: Option<i32>,
        progress: f64,
    ) -> Result<TraktScrobbleResponse, TraktError> {
        let payload = self.build_payload(movie_ids, episode_ids, season, number, progress);
        self.api_client.request(Method::POST, "/scrobble/start", Some(payload)).await
    }

    pub async fn pause(
        &self,
        movie_ids: Option<TraktIds>,
        episode_ids: Option<TraktIds>,
        season: Option<i32>,
        number: Option<i32>,
        progress: f64,
    ) -> Result<TraktScrobbleResponse, TraktError> {
        let payload = self.build_payload(movie_ids, episode_ids, season, number, progress);
        // Trakt treats progress < 80% as pause when calling /scrobble/stop
        self.api_client.request(Method::POST, "/scrobble/stop", Some(payload)).await
    }

    pub async fn stop(
        &self,
        movie_ids: Option<TraktIds>,
        episode_ids: Option<TraktIds>,
        season: Option<i32>,
        number: Option<i32>,
        progress: f64,
    ) -> Result<TraktScrobbleResponse, TraktError> {
        let content_key = self.get_content_key(&movie_ids, &episode_ids, season, number);
        
        if let Some(key) = content_key {
            let mut scrobbled = self.scrobbled_items.lock().await;
            let now = Utc::now().timestamp_millis();
            
            // Cleanup old items
            scrobbled.retain(|_, &mut ts| now - ts < self.expiry_ms);
            
            if scrobbled.contains_key(&key) {
                return Err(TraktError::ApiError("Already scrobbled recently".to_string()));
            }

            let payload = self.build_payload(movie_ids, episode_ids, season, number, progress);
            let response: TraktScrobbleResponse = self.api_client.request(Method::POST, "/scrobble/stop", Some(payload)).await?;
            
            if progress >= self.completion_threshold {
                scrobbled.insert(key, now);
            }
            
            Ok(response)
        } else {
            let payload = self.build_payload(movie_ids, episode_ids, season, number, progress);
            self.api_client.request(Method::POST, "/scrobble/stop", Some(payload)).await
        }
    }

    fn build_payload(
        &self,
        movie_ids: Option<TraktIds>,
        episode_ids: Option<TraktIds>,
        season: Option<i32>,
        number: Option<i32>,
        progress: f64,
    ) -> TraktScrobblePayload {
        TraktScrobblePayload {
            movie: movie_ids.map(|ids| TraktMoviePayload {
                ids,
                title: None,
                year: None,
            }),
            episode: episode_ids.map(|ids| TraktEpisodePayload {
                ids,
                season: season.unwrap_or(0),
                number: number.unwrap_or(0),
            }),
            progress,
            app_version: Some("1.0.0".to_string()),
            app_date: Some(Utc::now().format("%Y-%m-%d").to_string()),
        }
    }

    fn get_content_key(
        &self,
        movie_ids: &Option<TraktIds>,
        episode_ids: &Option<TraktIds>,
        season: Option<i32>,
        number: Option<i32>,
    ) -> Option<String> {
        if let Some(m) = movie_ids {
            if let Some(imdb) = &m.imdb {
                return Some(format!("movie:{}", imdb));
            }
            return Some(format!("movie:trakt:{}", m.trakt));
        }
        if let Some(e) = episode_ids {
            if let Some(imdb) = &e.imdb {
                return Some(format!("episode:{}", imdb));
            }
            if let (Some(s), Some(n)) = (season, number) {
                return Some(format!("episode:trakt:{}:s{}:e{}", e.trakt, s, n));
            }
        }
        None
    }
}
