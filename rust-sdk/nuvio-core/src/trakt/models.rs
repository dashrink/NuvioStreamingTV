use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default, uniffi::Record)]
pub struct TraktIds {
    pub trakt: i32,
    pub slug: Option<String>,
    pub tvdb: Option<i32>,
    pub imdb: Option<String>,
    pub tmdb: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktUser {
    pub username: String,
    pub private: bool,
    pub name: Option<String>,
    pub vip: bool,
    pub vip_ep: bool,
    pub ids: TraktUserIds,
    pub joined_at: String,
    pub location: Option<String>,
    pub about: Option<String>,
    pub gender: Option<String>,
    pub age: Option<i32>,
    pub images: Option<TraktUserImages>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktUserIds {
    pub slug: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktUserImages {
    pub avatar: TraktImageSource,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktImageSource {
    pub full: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktMovie {
    pub title: String,
    pub year: Option<i32>,
    pub ids: TraktIds,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktShow {
    pub title: String,
    pub year: Option<i32>,
    pub ids: TraktIds,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktEpisode {
    pub season: i32,
    pub number: i32,
    pub title: Option<String>,
    pub ids: TraktIds,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktWatchedItem {
    pub plays: i32,
    pub last_watched_at: String,
    pub movie: Option<TraktMovie>,
    pub show: Option<TraktShow>,
    pub seasons: Option<Vec<TraktWatchedSeason>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktWatchedSeason {
    pub number: i32,
    pub episodes: Vec<TraktWatchedEpisode>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktWatchedEpisode {
    pub number: i32,
    pub plays: i32,
    pub last_watched_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktPlaybackItem {
    pub id: i64,
    pub progress: f64,
    pub paused_at: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub movie: Option<TraktMovie>,
    pub episode: Option<TraktEpisode>,
    pub show: Option<TraktShow>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktScrobblePayload {
    pub movie: Option<TraktMoviePayload>,
    pub episode: Option<TraktEpisodePayload>,
    pub progress: f64,
    pub app_version: Option<String>,
    pub app_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktMoviePayload {
    pub ids: TraktIds,
    pub title: Option<String>,
    pub year: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktEpisodePayload {
    pub ids: TraktIds,
    pub season: i32,
    pub number: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktScrobbleResponse {
    pub id: i64,
    pub action: String,
    pub progress: f64,
    pub movie: Option<TraktMovie>,
    pub episode: Option<TraktEpisode>,
    pub show: Option<TraktShow>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktHistoryItem {
    pub id: i64,
    pub watched_at: String,
    pub action: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub movie: Option<TraktMovie>,
    pub episode: Option<TraktEpisode>,
    pub show: Option<TraktShow>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktSearchItem {
    #[serde(rename = "type")]
    pub item_type: String,
    pub score: Option<f64>,
    pub movie: Option<TraktMovie>,
    pub show: Option<TraktShow>,
    pub episode: Option<TraktEpisode>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktRatingItem {
    pub rated_at: String,
    pub rating: i32,
    #[serde(rename = "type")]
    pub item_type: String,
    pub movie: Option<TraktMovie>,
    pub show: Option<TraktShow>,
    pub season: Option<TraktSeasonRating>,
    pub episode: Option<TraktEpisode>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktSeasonRating {
    pub number: i32,
    pub ids: TraktIds,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktWatchlistItem {
    pub rank: i32,
    pub id: i64,
    pub listed_at: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub movie: Option<TraktMovie>,
    pub show: Option<TraktShow>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktCollectionItem {
    pub collected_at: String,
    pub movie: Option<TraktMovie>,
    pub show: Option<TraktShow>,
    pub seasons: Option<Vec<TraktCollectionSeason>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktCollectionSeason {
    pub number: i32,
    pub episodes: Vec<TraktCollectionEpisode>,
}

#[derive(Debug, Serialize, Deserialize, Clone, uniffi::Record)]
pub struct TraktCollectionEpisode {
    pub number: i32,
    pub collected_at: String,
}
