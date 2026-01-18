use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbEpisode {
    pub id: i32,
    pub name: String,
    pub overview: String,
    pub episode_number: i32,
    pub season_number: i32,
    pub still_path: Option<String>,
    pub air_date: Option<String>,
    pub vote_average: Option<f64>,
    pub imdb_id: Option<String>,
    pub season_poster_path: Option<String>,
    pub runtime: Option<i32>,
    pub credits: Option<Credits>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbSeason {
    pub id: i32,
    pub name: String,
    pub overview: String,
    pub season_number: i32,
    pub episodes: Vec<TmdbEpisode>,
    pub poster_path: Option<String>,
    pub air_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbGenre {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbSeasonSummary {
    pub id: i32,
    pub name: String,
    pub season_number: i32,
    pub episode_count: i32,
    pub poster_path: Option<String>,
    pub air_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbCreator {
    pub id: i32,
    pub name: String,
    pub profile_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbNetwork {
    pub id: i32,
    pub name: String,
    pub logo_path: Option<String>,
    pub origin_country: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbShow {
    pub id: i32,
    pub name: String,
    pub overview: String,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub first_air_date: Option<String>,
    pub last_air_date: Option<String>,
    pub number_of_seasons: i32,
    pub number_of_episodes: i32,
    pub genres: Vec<TmdbGenre>,
    pub seasons: Vec<TmdbSeasonSummary>,
    pub status: String,
    pub type_field: String, // 'type' is a reserved keyword
    pub original_language: String,
    // created_by and networks left out for brevity/complexity in initial pass or add them
    pub created_by: Vec<TmdbCreator>,
    pub networks: Vec<TmdbNetwork>,
    pub credits: Option<Credits>,
    pub external_ids: Option<TmdbExternalIds>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbSearchResult {
    pub id: i32,
    // Unified fields for Movie/TV/Person
    pub media_type: Option<String>,
    pub title: Option<String>, // For movies
    pub name: Option<String>, // For TV/Person
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub release_date: Option<String>, // Movie
    pub first_air_date: Option<String>, // TV
    pub genre_ids: Vec<i32>,
    pub popularity: f64,
    pub vote_average: Option<f64>,
    pub vote_count: Option<i32>,
    pub profile_path: Option<String>, // Person
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbExternalIds {
    pub imdb_id: Option<String>,
    pub freebase_mid: Option<String>,
    pub freebase_id: Option<String>,
    pub tvdb_id: Option<i32>,
    pub tvrage_id: Option<i32>,
    pub wikidata_id: Option<String>,
    pub facebook_id: Option<String>,
    pub instagram_id: Option<String>,
    pub twitter_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct CastMember {
    pub id: i32,
    pub name: String,
    pub character: String,
    pub profile_path: Option<String>,
    pub order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct CrewMember {
    pub id: i32,
    pub name: String,
    pub job: String,
    pub department: String,
    pub profile_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct Credits {
    pub cast: Vec<CastMember>,
    pub crew: Vec<CrewMember>,
    pub guest_stars: Option<Vec<CastMember>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbPerson {
    pub id: i32,
    pub name: String,
    pub biography: String,
    pub birthday: Option<String>,
    pub deathday: Option<String>,
    pub place_of_birth: Option<String>,
    pub profile_path: Option<String>,
    pub known_for_department: String,
    pub external_ids: Option<TmdbExternalIds>,
    pub combined_credits: Option<PersonCombinedCredits>,
}

// Response Wrappers
#[derive(Deserialize)]
pub struct SearchResponse {
    pub results: Vec<TmdbSearchResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct PersonMovieCredit {
    pub id: i32,
    pub title: String,
    pub character: String,
    pub poster_path: Option<String>,
    pub release_date: Option<String>,
    pub vote_average: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct PersonTvCredit {
    pub id: i32,
    pub name: String,
    pub character: String,
    pub poster_path: Option<String>,
    pub first_air_date: Option<String>,
    pub vote_average: Option<f64>,
    pub episode_count: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct PersonCombinedCredit {
    pub id: i32,
    pub media_type: String, // "movie" or "tv"
    pub title: Option<String>, // movie
    pub name: Option<String>, // tv
    pub character: String,
    pub poster_path: Option<String>,
    pub release_date: Option<String>,
    pub first_air_date: Option<String>,
    pub vote_average: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct PersonMovieCredits {
    pub cast: Vec<PersonMovieCredit>,
    pub crew: Vec<PersonMovieCredit>, // Crew fields might differ (job) but for now assuming similar or generic enough
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct PersonTvCredits {
    pub cast: Vec<PersonTvCredit>,
    // crew...
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct PersonCombinedCredits {
    pub cast: Vec<PersonCombinedCredit>,
    pub crew: Vec<PersonCombinedCredit>,
}

// Response structs (internal use mostly, unless exposed)
#[derive(Deserialize)]
pub struct PersonMovieCreditsResponse {
    pub cast: Vec<PersonMovieCredit>,
    pub crew: Vec<PersonMovieCredit>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct IMDbRatingEpisode {
    pub vote_average: Option<f64>,
    pub episode_number: i32,
    pub name: String,
    pub season_number: i32,
    pub tconst: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbMovie {
    pub id: i32,
    pub title: String,
    pub original_title: String,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub release_date: Option<String>,
    pub runtime: Option<i32>,
    pub vote_average: Option<f64>,
    pub vote_count: Option<i32>,
    pub status: Option<String>,
    pub tagline: Option<String>,
    pub genres: Vec<TmdbGenre>,
    pub credits: Option<Credits>, // via append_to_response
    pub external_ids: Option<TmdbExternalIds>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbCollectionPart {
  pub id: i32,
  pub title: String,
  pub overview: Option<String>,
  pub poster_path: Option<String>,
  pub backdrop_path: Option<String>,
  pub release_date: Option<String>,
  pub vote_average: Option<f64>,
  pub vote_count: Option<i32>,
  pub genre_ids: Vec<i32>,
  pub original_language: String,
  pub original_title: String,
  pub popularity: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct TmdbCollection {
  pub id: i32,
  pub name: String,
  pub overview: Option<String>,
  pub poster_path: Option<String>,
  pub backdrop_path: Option<String>,
  pub parts: Vec<TmdbCollectionPart>,
}




#[derive(Debug, Clone, Serialize, Deserialize, uniffi::Record)]
pub struct IMDbRatingSeason {
    pub episodes: Vec<IMDbRatingEpisode>,
}
