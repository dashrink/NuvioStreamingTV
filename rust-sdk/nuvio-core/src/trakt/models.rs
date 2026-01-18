//! Trakt API data models
//!
//! This module contains all data models for the Trakt.tv API integration.
//! All types are designed to be FFI-compatible using UniFFI and support
//! JSON serialization/deserialization via serde.

use serde::{Deserialize, Serialize};

// ============================================================================
// Core ID Types
// ============================================================================

/// Trakt IDs for content items (movies, shows, episodes)
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktIds {
    pub trakt: i64,
    pub slug: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub imdb: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tmdb: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tvdb: Option<i64>,
}

// ============================================================================
// Content Types
// ============================================================================

/// Trakt movie metadata
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktMovie {
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<i32>,
    pub ids: TraktIds,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tagline: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overview: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub released: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub runtime: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
}

/// Trakt show metadata
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktShow {
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<i32>,
    pub ids: TraktIds,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overview: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_aired: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub runtime: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}

/// Trakt episode metadata
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktEpisode {
    pub season: i32,
    pub number: i32,
    pub title: String,
    pub ids: TraktIds,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overview: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_aired: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub runtime: Option<i32>,
}

// ============================================================================
// Calendar Types
// ============================================================================

/// Calendar item for TV shows - represents an episode airing on a specific date
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktCalendarShow {
    /// When the episode first aired (ISO 8601 format)
    pub first_aired: String,
    /// The episode details
    pub episode: TraktEpisode,
    /// The show details
    pub show: TraktShow,
}

/// Calendar item for movies - represents a movie releasing on a specific date
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktCalendarMovie {
    /// When the movie was/will be released (ISO 8601 date format)
    pub released: String,
    /// The movie details
    pub movie: TraktMovie,
}

// ============================================================================
// Sync Types
// ============================================================================

/// Watched item from sync history
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktWatchedItem {
    pub plays: i32,
    pub last_watched_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reset_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub movie: Option<TraktMovie>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show: Option<TraktShow>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seasons: Option<Vec<TraktWatchedSeason>>,
}

/// Season data in watched history
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktWatchedSeason {
    pub number: i32,
    pub episodes: Vec<TraktWatchedEpisode>,
}

/// Episode data in watched history
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktWatchedEpisode {
    pub number: i32,
    pub plays: i32,
    pub last_watched_at: String,
}

// ============================================================================
// Recommendations Types
// ============================================================================

/// Recommendation item - can be either a movie or show recommendation
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktRecommendation {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub movie: Option<TraktMovie>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show: Option<TraktShow>,
}

// ============================================================================
// Search Types
// ============================================================================

/// Search result item containing the search score and the matched content
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktSearchResult {
    /// Type of the search result (movie, show, episode, person, list)
    #[serde(rename = "type")]
    pub result_type: String,
    /// Search relevance score
    pub score: f64,
    /// Movie data if this is a movie result
    #[serde(skip_serializing_if = "Option::is_none")]
    pub movie: Option<TraktMovie>,
    /// Show data if this is a show result
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show: Option<TraktShow>,
    /// Episode data if this is an episode result
    #[serde(skip_serializing_if = "Option::is_none")]
    pub episode: Option<TraktEpisode>,
}

// ============================================================================
// User Settings Types
// ============================================================================

/// User settings from /users/settings endpoint
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktUserSettings {
    /// User profile information
    pub user: TraktUserSettingsUser,
    /// Account information including VIP status
    pub account: TraktUserSettingsAccount,
}

/// User profile information from settings
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktUserSettingsUser {
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub private: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vip: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vip_ep: Option<bool>,
}

/// Account information from settings
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktUserSettingsAccount {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timezone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date_format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time_24hr: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover_image: Option<String>,
}

// ============================================================================
// Comment Types
// ============================================================================

/// User IDs for comment authors
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktCommentUserIds {
    pub slug: String,
}

/// User statistics for comment authors
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktCommentUserStats {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rating: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub play_count: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_count: Option<i32>,
}

/// User information for comment authors
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktCommentUser {
    pub username: String,
    pub private: bool,
    pub vip: bool,
    pub vip_ep: bool,
    pub ids: TraktCommentUserIds,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deleted: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub director: Option<bool>,
}

/// Comment data from Trakt API
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktComment {
    pub id: i64,
    pub comment: String,
    pub spoiler: bool,
    pub review: bool,
    pub parent_id: i64,
    pub created_at: String,
    pub updated_at: String,
    pub replies: i32,
    pub likes: i32,
    pub language: String,
    pub user: TraktCommentUser,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_rating: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_stats: Option<TraktCommentUserStats>,
}

// ============================================================================
// Sync / History Types
// ============================================================================

/// Season information for history removal
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktHistorySeason {
    pub number: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub episodes: Option<Vec<TraktHistoryEpisode>>,
}

/// Episode information for history removal
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktHistoryEpisode {
    pub number: i32,
}

/// Partial IDs for history removal requests
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktHistoryIds {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trakt: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub imdb: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tmdb: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tvdb: Option<i64>,
}

/// Movie item for history removal
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktHistoryMovie {
    pub ids: TraktHistoryIds,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<i32>,
}

/// Show item for history removal
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktHistoryShow {
    pub ids: TraktHistoryIds,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seasons: Option<Vec<TraktHistorySeason>>,
}

/// Payload for removing items from watched history
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktHistoryRemovePayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub movies: Option<Vec<TraktHistoryMovie>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shows: Option<Vec<TraktHistoryShow>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ids: Option<Vec<i64>>,
}

/// Not found item in history removal response
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktHistoryNotFoundItem {
    pub ids: TraktHistoryIds,
}

/// Response from history removal API
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktHistoryRemoveResponse {
    pub deleted: TraktHistoryDeletedCount,
    pub not_found: TraktHistoryNotFound,
}

/// Count of deleted items
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktHistoryDeletedCount {
    pub movies: i32,
    pub episodes: i32,
}

/// Not found items
#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TraktHistoryNotFound {
    pub movies: Vec<TraktHistoryNotFoundItem>,
    pub shows: Vec<TraktHistoryNotFoundItem>,
    pub episodes: Vec<TraktHistoryNotFoundItem>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calendar_show_serialization() {
        let calendar_show = TraktCalendarShow {
            first_aired: "2024-01-15T20:00:00.000Z".to_string(),
            episode: TraktEpisode {
                season: 1,
                number: 5,
                title: "The Test Episode".to_string(),
                ids: TraktIds {
                    trakt: 12345,
                    slug: "the-test-episode".to_string(),
                    imdb: Some("tt1234567".to_string()),
                    tmdb: Some(67890),
                    tvdb: Some(98765),
                },
                overview: Some("A test episode".to_string()),
                first_aired: Some("2024-01-15T20:00:00.000Z".to_string()),
                runtime: Some(42),
            },
            show: TraktShow {
                title: "Test Show".to_string(),
                year: Some(2024),
                ids: TraktIds {
                    trakt: 54321,
                    slug: "test-show".to_string(),
                    imdb: Some("tt7654321".to_string()),
                    tmdb: Some(11111),
                    tvdb: Some(22222),
                },
                overview: Some("A test show".to_string()),
                first_aired: Some("2024-01-01T00:00:00.000Z".to_string()),
                runtime: Some(42),
                network: Some("Test Network".to_string()),
                status: Some("returning series".to_string()),
            },
        };

        // Test serialization
        let json = serde_json::to_string(&calendar_show).unwrap();
        assert!(json.contains("first_aired"));
        assert!(json.contains("The Test Episode"));

        // Test deserialization
        let deserialized: TraktCalendarShow = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.episode.title, "The Test Episode");
        assert_eq!(deserialized.show.title, "Test Show");
    }

    #[test]
    fn test_calendar_movie_serialization() {
        let calendar_movie = TraktCalendarMovie {
            released: "2024-03-15".to_string(),
            movie: TraktMovie {
                title: "Test Movie".to_string(),
                year: Some(2024),
                ids: TraktIds {
                    trakt: 99999,
                    slug: "test-movie".to_string(),
                    imdb: Some("tt9999999".to_string()),
                    tmdb: Some(88888),
                    tvdb: None,
                },
                tagline: Some("The ultimate test".to_string()),
                overview: Some("A movie for testing".to_string()),
                released: Some("2024-03-15".to_string()),
                runtime: Some(120),
                language: Some("en".to_string()),
            },
        };

        // Test serialization
        let json = serde_json::to_string(&calendar_movie).unwrap();
        assert!(json.contains("released"));
        assert!(json.contains("Test Movie"));

        // Test deserialization
        let deserialized: TraktCalendarMovie = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.movie.title, "Test Movie");
        assert_eq!(deserialized.released, "2024-03-15");
    }

    #[test]
    fn test_trakt_ids_serialization() {
        let ids = TraktIds {
            trakt: 123,
            slug: "test-slug".to_string(),
            imdb: Some("tt1234567".to_string()),
            tmdb: Some(456),
            tvdb: None,
        };

        let json = serde_json::to_string(&ids).unwrap();
        assert!(json.contains("trakt"));
        assert!(json.contains("test-slug"));
        // tvdb should not be present in JSON since it's None
        assert!(!json.contains("tvdb"));
    }

    #[test]
    fn test_recommendation_movie_serialization() {
        let recommendation = TraktRecommendation {
            movie: Some(TraktMovie {
                title: "Recommended Movie".to_string(),
                year: Some(2024),
                ids: TraktIds {
                    trakt: 11111,
                    slug: "recommended-movie".to_string(),
                    imdb: Some("tt1111111".to_string()),
                    tmdb: Some(22222),
                    tvdb: None,
                },
                tagline: Some("You'll love this".to_string()),
                overview: Some("A highly recommended movie".to_string()),
                released: Some("2024-01-15".to_string()),
                runtime: Some(105),
                language: Some("en".to_string()),
            }),
            show: None,
        };

        // Test serialization
        let json = serde_json::to_string(&recommendation).unwrap();
        assert!(json.contains("Recommended Movie"));
        assert!(!json.contains("show"));

        // Test deserialization
        let deserialized: TraktRecommendation = serde_json::from_str(&json).unwrap();
        assert!(deserialized.movie.is_some());
        assert!(deserialized.show.is_none());
        assert_eq!(deserialized.movie.unwrap().title, "Recommended Movie");
    }

    #[test]
    fn test_recommendation_show_serialization() {
        let recommendation = TraktRecommendation {
            movie: None,
            show: Some(TraktShow {
                title: "Recommended Show".to_string(),
                year: Some(2024),
                ids: TraktIds {
                    trakt: 33333,
                    slug: "recommended-show".to_string(),
                    imdb: Some("tt3333333".to_string()),
                    tmdb: Some(44444),
                    tvdb: Some(55555),
                },
                overview: Some("A highly recommended show".to_string()),
                first_aired: Some("2024-02-01T00:00:00.000Z".to_string()),
                runtime: Some(45),
                network: Some("Premium Network".to_string()),
                status: Some("returning series".to_string()),
            }),
        };

        // Test serialization
        let json = serde_json::to_string(&recommendation).unwrap();
        assert!(json.contains("Recommended Show"));
        assert!(!json.contains("movie"));

        // Test deserialization
        let deserialized: TraktRecommendation = serde_json::from_str(&json).unwrap();
        assert!(deserialized.show.is_some());
        assert!(deserialized.movie.is_none());
        assert_eq!(deserialized.show.unwrap().title, "Recommended Show");
    }

    #[test]
    fn test_search_result_movie_serialization() {
        let search_result = TraktSearchResult {
            result_type: "movie".to_string(),
            score: 1000.0,
            movie: Some(TraktMovie {
                title: "Search Result Movie".to_string(),
                year: Some(2024),
                ids: TraktIds {
                    trakt: 77777,
                    slug: "search-result-movie".to_string(),
                    imdb: Some("tt7777777".to_string()),
                    tmdb: Some(88888),
                    tvdb: None,
                },
                tagline: Some("Found it!".to_string()),
                overview: Some("A movie found via search".to_string()),
                released: Some("2024-05-20".to_string()),
                runtime: Some(95),
                language: Some("en".to_string()),
            }),
            show: None,
            episode: None,
        };

        // Test serialization
        let json = serde_json::to_string(&search_result).unwrap();
        assert!(json.contains("\"type\":\"movie\""));
        assert!(json.contains("\"score\":1000"));
        assert!(json.contains("Search Result Movie"));
        assert!(!json.contains("show"));
        assert!(!json.contains("episode"));

        // Test deserialization
        let deserialized: TraktSearchResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.result_type, "movie");
        assert_eq!(deserialized.score, 1000.0);
        assert!(deserialized.movie.is_some());
        assert!(deserialized.show.is_none());
        assert!(deserialized.episode.is_none());
        assert_eq!(deserialized.movie.unwrap().title, "Search Result Movie");
    }

    #[test]
    fn test_search_result_show_serialization() {
        let search_result = TraktSearchResult {
            result_type: "show".to_string(),
            score: 950.5,
            movie: None,
            show: Some(TraktShow {
                title: "Search Result Show".to_string(),
                year: Some(2023),
                ids: TraktIds {
                    trakt: 66666,
                    slug: "search-result-show".to_string(),
                    imdb: Some("tt6666666".to_string()),
                    tmdb: Some(77777),
                    tvdb: Some(88888),
                },
                overview: Some("A show found via search".to_string()),
                first_aired: Some("2023-09-15T00:00:00.000Z".to_string()),
                runtime: Some(50),
                network: Some("Search Network".to_string()),
                status: Some("returning series".to_string()),
            }),
            episode: None,
        };

        // Test serialization
        let json = serde_json::to_string(&search_result).unwrap();
        assert!(json.contains("\"type\":\"show\""));
        assert!(json.contains("\"score\":950.5"));
        assert!(json.contains("Search Result Show"));
        assert!(!json.contains("movie"));
        assert!(!json.contains("episode"));

        // Test deserialization
        let deserialized: TraktSearchResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.result_type, "show");
        assert_eq!(deserialized.score, 950.5);
        assert!(deserialized.show.is_some());
        assert!(deserialized.movie.is_none());
        assert!(deserialized.episode.is_none());
        assert_eq!(deserialized.show.unwrap().title, "Search Result Show");
    }

    #[test]
    fn test_search_result_episode_serialization() {
        let search_result = TraktSearchResult {
            result_type: "episode".to_string(),
            score: 875.25,
            movie: None,
            show: None,
            episode: Some(TraktEpisode {
                season: 2,
                number: 8,
                title: "Search Result Episode".to_string(),
                ids: TraktIds {
                    trakt: 99999,
                    slug: "search-result-episode".to_string(),
                    imdb: Some("tt9999999".to_string()),
                    tmdb: Some(12345),
                    tvdb: Some(67890),
                },
                overview: Some("An episode found via search".to_string()),
                first_aired: Some("2024-06-10T20:00:00.000Z".to_string()),
                runtime: Some(42),
            }),
        };

        // Test serialization
        let json = serde_json::to_string(&search_result).unwrap();
        assert!(json.contains("\"type\":\"episode\""));
        assert!(json.contains("\"score\":875.25"));
        assert!(json.contains("Search Result Episode"));
        assert!(!json.contains("movie"));
        assert!(!json.contains("\"show\":"));

        // Test deserialization
        let deserialized: TraktSearchResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.result_type, "episode");
        assert_eq!(deserialized.score, 875.25);
        assert!(deserialized.episode.is_some());
        assert!(deserialized.movie.is_none());
        assert!(deserialized.show.is_none());
        assert_eq!(deserialized.episode.unwrap().title, "Search Result Episode");
    }

    #[test]
    fn test_comment_serialization() {
        let comment = TraktComment {
            id: 12345,
            comment: "This is a great movie!".to_string(),
            spoiler: false,
            review: true,
            parent_id: 0,
            created_at: "2024-01-15T10:30:00.000Z".to_string(),
            updated_at: "2024-01-15T10:30:00.000Z".to_string(),
            replies: 5,
            likes: 42,
            language: "en".to_string(),
            user: TraktCommentUser {
                username: "testuser".to_string(),
                private: false,
                vip: true,
                vip_ep: false,
                ids: TraktCommentUserIds {
                    slug: "testuser".to_string(),
                },
                deleted: None,
                name: Some("Test User".to_string()),
                director: Some(false),
            },
            user_rating: Some(9),
            user_stats: Some(TraktCommentUserStats {
                rating: Some(8),
                play_count: Some(100),
                completed_count: Some(50),
            }),
        };

        // Test serialization
        let json = serde_json::to_string(&comment).unwrap();
        assert!(json.contains("\"id\":12345"));
        assert!(json.contains("This is a great movie!"));
        assert!(json.contains("\"spoiler\":false"));
        assert!(json.contains("\"review\":true"));
        assert!(json.contains("\"replies\":5"));
        assert!(json.contains("\"likes\":42"));
        assert!(json.contains("testuser"));

        // Test deserialization
        let deserialized: TraktComment = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, 12345);
        assert_eq!(deserialized.comment, "This is a great movie!");
        assert_eq!(deserialized.spoiler, false);
        assert_eq!(deserialized.review, true);
        assert_eq!(deserialized.replies, 5);
        assert_eq!(deserialized.likes, 42);
        assert_eq!(deserialized.user.username, "testuser");
        assert_eq!(deserialized.user.vip, true);
        assert_eq!(deserialized.user_rating, Some(9));
    }

    #[test]
    fn test_comment_user_serialization() {
        let user = TraktCommentUser {
            username: "moviefan".to_string(),
            private: true,
            vip: false,
            vip_ep: false,
            ids: TraktCommentUserIds {
                slug: "moviefan".to_string(),
            },
            deleted: Some(false),
            name: Some("Movie Fan".to_string()),
            director: None,
        };

        // Test serialization
        let json = serde_json::to_string(&user).unwrap();
        assert!(json.contains("\"username\":\"moviefan\""));
        assert!(json.contains("\"private\":true"));
        assert!(json.contains("\"vip\":false"));
        assert!(json.contains("Movie Fan"));
        assert!(!json.contains("director"));

        // Test deserialization
        let deserialized: TraktCommentUser = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.username, "moviefan");
        assert_eq!(deserialized.private, true);
        assert_eq!(deserialized.vip, false);
        assert_eq!(deserialized.name, Some("Movie Fan".to_string()));
        assert_eq!(deserialized.director, None);
    }

    #[test]
    fn test_user_settings_standard_user_serialization() {
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
                date_format: Some("mdy".to_string()),
                time_24hr: Some(false),
                cover_image: Some("https://example.com/cover.jpg".to_string()),
            },
        };

        // Test serialization
        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("\"username\":\"standard_user\""));
        assert!(json.contains("\"vip\":false"));
        assert!(json.contains("\"vip_ep\":false"));
        assert!(json.contains("America/Los_Angeles"));

        // Test deserialization
        let deserialized: TraktUserSettings = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.user.username, "standard_user");
        assert_eq!(deserialized.user.vip, Some(false));
        assert_eq!(deserialized.user.vip_ep, Some(false));
        assert_eq!(
            deserialized.account.timezone,
            Some("America/Los_Angeles".to_string())
        );
    }

    #[test]
    fn test_user_settings_vip_user_serialization() {
        let settings = TraktUserSettings {
            user: TraktUserSettingsUser {
                username: "vip_user".to_string(),
                private: Some(false),
                name: Some("VIP User".to_string()),
                vip: Some(true),
                vip_ep: Some(false),
            },
            account: TraktUserSettingsAccount {
                timezone: Some("Europe/London".to_string()),
                date_format: Some("dmy".to_string()),
                time_24hr: Some(true),
                cover_image: None,
            },
        };

        // Test serialization
        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("\"username\":\"vip_user\""));
        assert!(json.contains("\"vip\":true"));
        assert!(json.contains("\"vip_ep\":false"));
        assert!(json.contains("Europe/London"));
        assert!(!json.contains("cover_image"));

        // Test deserialization
        let deserialized: TraktUserSettings = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.user.username, "vip_user");
        assert_eq!(deserialized.user.vip, Some(true));
        assert_eq!(deserialized.user.vip_ep, Some(false));
        assert_eq!(
            deserialized.account.timezone,
            Some("Europe/London".to_string())
        );
        assert_eq!(deserialized.account.cover_image, None);
    }

    #[test]
    fn test_user_settings_vip_ep_user_serialization() {
        let settings = TraktUserSettings {
            user: TraktUserSettingsUser {
                username: "vip_ep_user".to_string(),
                private: Some(true),
                name: Some("VIP EP User".to_string()),
                vip: Some(false),
                vip_ep: Some(true),
            },
            account: TraktUserSettingsAccount {
                timezone: Some("Asia/Tokyo".to_string()),
                date_format: None,
                time_24hr: None,
                cover_image: None,
            },
        };

        // Test serialization
        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("\"username\":\"vip_ep_user\""));
        assert!(json.contains("\"vip\":false"));
        assert!(json.contains("\"vip_ep\":true"));
        assert!(json.contains("Asia/Tokyo"));

        // Test deserialization
        let deserialized: TraktUserSettings = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.user.username, "vip_ep_user");
        assert_eq!(deserialized.user.vip, Some(false));
        assert_eq!(deserialized.user.vip_ep, Some(true));
        assert_eq!(
            deserialized.account.timezone,
            Some("Asia/Tokyo".to_string())
        );
    }

    #[test]
    fn test_user_settings_minimal_fields() {
        let settings = TraktUserSettings {
            user: TraktUserSettingsUser {
                username: "minimal_user".to_string(),
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

        // Test serialization
        let json = serde_json::to_string(&settings).unwrap();
        assert!(json.contains("\"username\":\"minimal_user\""));
        assert!(!json.contains("private"));
        assert!(!json.contains("vip"));
        assert!(!json.contains("timezone"));

        // Test deserialization
        let deserialized: TraktUserSettings = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.user.username, "minimal_user");
        assert_eq!(deserialized.user.vip, None);
        assert_eq!(deserialized.user.vip_ep, None);
        assert_eq!(deserialized.account.timezone, None);
    }
}
