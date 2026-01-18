pub mod error;
pub mod models;
pub mod storage;

use std::sync::Arc;
use tokio::runtime::Runtime;
use reqwest::Client;

use crate::tmdb::error::TmdbError;
use crate::tmdb::models::*;
use crate::tmdb::storage::TmdbStorage;
use serde::{Deserialize, Serialize};


#[derive(uniffi::Record)]
pub struct TmdbConfig {
    pub api_key: String,
    pub base_url: String, // Default: "https://api.themoviedb.org/3"
    pub imdb_ratings_api_base_url: Option<String>,
    pub language: String, // Default: "en-US"
}

#[derive(uniffi::Object)]
pub struct Tmdb {
    client: Client,
    config: TmdbConfig,
    storage: Box<dyn TmdbStorage>,
    runtime: Arc<Runtime>,
    cache_ttl_ms: i64,
}

#[uniffi::export]
impl Tmdb {
    #[uniffi::constructor]
    pub fn new(config: TmdbConfig, storage: Box<dyn TmdbStorage>) -> Result<Self, TmdbError> {
        let runtime = Runtime::new().map_err(|e| TmdbError::Generic(e.to_string()))?;
        
        Ok(Self {
            client: Client::new(),
            config,
            storage,
            runtime: Arc::new(runtime),
            cache_ttl_ms: 7 * 24 * 60 * 60 * 1000, // 7 days default
        })
    }

    pub fn search_tv_show(&self, query: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
        self.runtime.block_on(self.search_tv_show_impl(query))
    }
    
    pub fn get_tv_show_details(&self, tmdb_id: i32) -> Result<TmdbShow, TmdbError> {
        self.runtime.block_on(self.get_tv_show_details_impl(tmdb_id))
    }

    pub fn get_season_details(&self, tmdb_id: i32, season_number: i32) -> Result<TmdbSeason, TmdbError> {
        self.runtime.block_on(self.get_season_details_impl(tmdb_id, season_number))
    }

    pub fn get_episode_details(&self, tmdb_id: i32, season_number: i32, episode_number: i32) -> Result<TmdbEpisode, TmdbError> {
        self.runtime.block_on(self.get_episode_details_impl(tmdb_id, season_number, episode_number))
    }

    pub fn get_episode_external_ids(&self, tmdb_id: i32, season_number: i32, episode_number: i32) -> Result<TmdbExternalIds, TmdbError> {
        self.runtime.block_on(self.get_episode_external_ids_impl(tmdb_id, season_number, episode_number))
    }

    pub fn get_collection_details(&self, collection_id: i32) -> Result<TmdbCollection, TmdbError> {
        self.runtime.block_on(self.get_collection_details_impl(collection_id))
    }

    pub fn find_by_imdb_id(&self, imdb_id: String) -> Result<Option<i32>, TmdbError> {
        self.runtime.block_on(self.find_by_imdb_id_impl(imdb_id))
    }
    
    pub fn get_image_url(&self, path: Option<String>, size: String) -> Option<String> {
       if let Some(p) = path {
           Some(format!("https://image.tmdb.org/t/p/{}{}", size, p))
       } else {
           None
       }
    }

    pub fn get_credits(&self, tmdb_id: i32, type_: String) -> Result<Credits, TmdbError> {
        self.runtime.block_on(self.get_credits_impl(tmdb_id, type_))
    }

    pub fn get_person_details(&self, person_id: i32) -> Result<TmdbPerson, TmdbError> {
        self.runtime.block_on(self.get_person_details_impl(person_id))
    }

    pub fn get_person_combined_credits(&self, person_id: i32) -> Result<PersonCombinedCredits, TmdbError> {
        self.runtime.block_on(self.get_person_combined_credits_impl(person_id))
    }

   pub fn get_imdb_ratings(&self, tmdb_id: i32) -> Result<Option<Vec<IMDbRatingSeason>>, TmdbError> {
        self.runtime.block_on(self.get_imdb_ratings_impl(tmdb_id))
   }

   pub fn get_show_external_ids(&self, tmdb_id: i32) -> Result<TmdbExternalIds, TmdbError> {
        self.runtime.block_on(self.get_show_external_ids_impl(tmdb_id))
   }

   pub fn search_movie(&self, query: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
        self.runtime.block_on(self.search_movie_impl(query))
    }

    pub fn search_person(&self, query: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
        self.runtime.block_on(self.search_person_impl(query))
    }

    pub fn search_multi(&self, query: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
        self.runtime.block_on(self.search_multi_impl(query))
    }

    pub fn get_movie_details(&self, tmdb_id: i32) -> Result<TmdbMovie, TmdbError> {
        self.runtime.block_on(self.get_movie_details_impl(tmdb_id))
    }

    pub fn get_trending(&self, time_window: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
        self.runtime.block_on(self.get_trending_impl(time_window))
    }

    pub fn get_popular(&self, type_: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
        self.runtime.block_on(self.get_popular_impl(type_))
    }
    
    pub fn get_top_rated(&self, type_: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
        self.runtime.block_on(self.get_top_rated_impl(type_))
    }

    pub fn get_recommendations(&self, type_: String, tmdb_id: i32) -> Result<Vec<TmdbSearchResult>, TmdbError> {
        self.runtime.block_on(self.get_recommendations_impl(type_, tmdb_id))
    }

    pub fn get_similar(&self, type_: String, tmdb_id: i32) -> Result<Vec<TmdbSearchResult>, TmdbError> {
        self.runtime.block_on(self.get_similar_impl(type_, tmdb_id))
    }

    pub fn get_all_episodes(&self, tmdb_id: i32) -> Result<Vec<TmdbEpisode>, TmdbError> {
        self.runtime.block_on(self.get_all_episodes_impl(tmdb_id))
    }

    pub fn get_show_image_hints(&self, tmdb_id: i32) -> Result<Vec<String>, TmdbError> {
        self.runtime.block_on(self.get_show_image_hints_impl(tmdb_id))
    }

    pub fn extract_tmdb_id_from_stremio_id(&self, stremio_id: String) -> Result<Option<i32>, TmdbError> {
        let parts: Vec<&str> = stremio_id.split(':').collect();
        if parts.is_empty() {
            return Ok(None);
        }
        let imdb_id = parts[0].to_string();
        self.find_by_imdb_id(imdb_id)
    }

    pub fn get_episode_image_url(&self, episode: TmdbEpisode, show: Option<TmdbShow>, size: String) -> Option<String> {
        // Try episode still first
        if let Some(path) = episode.still_path {
            return self.get_image_url(Some(path), size);
        }

        // Try season poster from show details
        if let Some(s) = &show {
            if let Some(season) = s.seasons.iter().find(|seas| seas.season_number == episode.season_number) {
                 if let Some(path) = &season.poster_path {
                     return self.get_image_url(Some(path.clone()), size.clone());
                 }
            }
            
            // Fallback to show poster
            if let Some(path) = &s.poster_path {
                return self.get_image_url(Some(path.clone()), size);
            }
        }

        None
    }
}

// Internal async implementations to allow composition
impl Tmdb {
    async fn search_tv_show_impl(&self, query: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
            let endpoint = "search/tv";
            let params = vec![
                ("query", query.as_str()),
                ("include_adult", "false"),
                ("language", &self.config.language),
                ("page", "1"),
            ];
            
            let cache_key = self.generate_cache_key(endpoint, &params);
            
            if let Some(cached) = self.get_cached::<Vec<TmdbSearchResult>>(&cache_key)? {
                return Ok(cached);
            }

            let response: SearchResponse = self.fetch(endpoint, &params).await?;
            let mut results = response.results;
            for result in &mut results {
                result.media_type = Some("tv".to_string());
            }
            
            self.set_cached(&cache_key, &results)?;
            
            Ok(results)
    }

    async fn get_tv_show_details_impl(&self, tmdb_id: i32) -> Result<TmdbShow, TmdbError> {
            let endpoint = format!("tv/{}", tmdb_id);
            let params = vec![
                ("language", self.config.language.as_str()),
                ("append_to_response", "external_ids,credits,keywords,networks"),
            ];

            let cache_key = self.generate_cache_key(&endpoint, &params);
             if let Some(cached) = self.get_cached::<TmdbShow>(&cache_key)? {
                return Ok(cached);
            }

            let show: TmdbShow = self.fetch(&endpoint, &params).await?;
            self.set_cached(&cache_key, &show)?;
            Ok(show)
    }

    async fn get_season_details_impl(&self, tmdb_id: i32, season_number: i32) -> Result<TmdbSeason, TmdbError> {
            let endpoint = format!("tv/{}/season/{}", tmdb_id, season_number);
            let params = vec![
                ("language", self.config.language.as_str()),
            ];

            let cache_key = self.generate_cache_key(&endpoint, &params);
            if let Some(cached) = self.get_cached::<TmdbSeason>(&cache_key)? {
                return Ok(cached);
            }

            let season: TmdbSeason = self.fetch(&endpoint, &params).await?;
            self.set_cached(&cache_key, &season)?;
            Ok(season)
    }

    async fn get_episode_details_impl(&self, tmdb_id: i32, season_number: i32, episode_number: i32) -> Result<TmdbEpisode, TmdbError> {
            let endpoint = format!("tv/{}/season/{}/episode/{}", tmdb_id, season_number, episode_number);
            let params = vec![
                ("language", self.config.language.as_str()),
                ("append_to_response", "credits"),
            ];

            let cache_key = self.generate_cache_key(&endpoint, &params);
             if let Some(cached) = self.get_cached::<TmdbEpisode>(&cache_key)? {
                return Ok(cached);
            }

            let episode: TmdbEpisode = self.fetch(&endpoint, &params).await?;
            self.set_cached(&cache_key, &episode)?;
            Ok(episode)
    }

    async fn get_episode_external_ids_impl(&self, tmdb_id: i32, season_number: i32, episode_number: i32) -> Result<TmdbExternalIds, TmdbError> {
        let endpoint = format!("tv/{}/season/{}/episode/{}/external_ids", tmdb_id, season_number, episode_number);
        let params = vec![];
        let cache_key = self.generate_cache_key(&endpoint, &params);
        if let Some(cached) = self.get_cached::<TmdbExternalIds>(&cache_key)? {
            return Ok(cached);
        }
        let ids: TmdbExternalIds = self.fetch(&endpoint, &params).await?;
        self.set_cached(&cache_key, &ids)?;
        Ok(ids)
    }

    async fn get_collection_details_impl(&self, collection_id: i32) -> Result<TmdbCollection, TmdbError> {
        let endpoint = format!("collection/{}", collection_id);
        let params = vec![
            ("language", self.config.language.as_str()),
        ];
        let cache_key = self.generate_cache_key(&endpoint, &params);
        if let Some(cached) = self.get_cached::<TmdbCollection>(&cache_key)? {
            return Ok(cached);
        }
        let collection: TmdbCollection = self.fetch(&endpoint, &params).await?;
        self.set_cached(&cache_key, &collection)?;
        Ok(collection)
    }

    async fn find_by_imdb_id_impl(&self, imdb_id: String) -> Result<Option<i32>, TmdbError> {
            let endpoint = format!("find/{}", imdb_id);
            let params = vec![
                ("external_source", "imdb_id"),
                ("language", self.config.language.as_str()),
            ];

             let cache_key = self.generate_cache_key(&endpoint, &params);
             if let Some(cached) = self.get_cached::<Option<i32>>(&cache_key)? {
                return Ok(cached); 
            }

            #[derive(Deserialize)]
            struct FindResponse {
                tv_results: Vec<TmdbSearchResult>,
                movie_results: Vec<TmdbSearchResult>,
            }

            let response: FindResponse = self.fetch(&endpoint, &params).await?;
            let mut result = None;

            if !response.tv_results.is_empty() {
                result = Some(response.tv_results[0].id);
            } else if !response.movie_results.is_empty() {
                result = Some(response.movie_results[0].id);
            }

            self.set_cached(&cache_key, &result)?;
            Ok(result)
    }
    
    async fn get_credits_impl(&self, tmdb_id: i32, type_: String) -> Result<Credits, TmdbError> {
            let endpoint_type = if type_ == "series" { "tv" } else { "movie" };
            let endpoint = format!("{}/{}/credits", endpoint_type, tmdb_id);
            let params = vec![("language", self.config.language.as_str())];

            let cache_key = self.generate_cache_key(&endpoint, &params);
            if let Some(cached) = self.get_cached::<Credits>(&cache_key)? {
                return Ok(cached);
            }

            let credits: Credits = self.fetch(&endpoint, &params).await?;
            self.set_cached(&cache_key, &credits)?;
            Ok(credits)
    }

    async fn get_person_details_impl(&self, person_id: i32) -> Result<TmdbPerson, TmdbError> {
            let endpoint = format!("person/{}", person_id);
            let params = vec![
                ("language", self.config.language.as_str()),
                ("append_to_response", "combined_credits,external_ids"),
            ];

            let cache_key = self.generate_cache_key(&endpoint, &params);
            if let Some(cached) = self.get_cached::<TmdbPerson>(&cache_key)? {
                return Ok(cached);
            }

            let person: TmdbPerson = self.fetch(&endpoint, &params).await?;
            self.set_cached(&cache_key, &person)?;
            Ok(person)
    }

    async fn get_person_combined_credits_impl(&self, person_id: i32) -> Result<PersonCombinedCredits, TmdbError> {
            let endpoint = format!("person/{}/combined_credits", person_id);
            let params = vec![("language", self.config.language.as_str())];

            let cache_key = self.generate_cache_key(&endpoint, &params);
            if let Some(cached) = self.get_cached::<PersonCombinedCredits>(&cache_key)? {
                return Ok(cached);
            }

            let credits: PersonCombinedCredits = self.fetch(&endpoint, &params).await?;
            self.set_cached(&cache_key, &credits)?;
            Ok(credits)
    }

    async fn get_imdb_ratings_impl(&self, tmdb_id: i32) -> Result<Option<Vec<IMDbRatingSeason>>, TmdbError> {
             let base_url = match &self.config.imdb_ratings_api_base_url {
                 Some(url) => url,
                 None => return Ok(None)
             };
             
             let cache_key = format!("tmdb_cache_imdb_ratings_{}", tmdb_id);
             
             if let Some(cached) = self.get_cached::<Vec<IMDbRatingSeason>>(&cache_key)? {
                 return Ok(Some(cached));
             }
             
             let url = format!("{}/api/shows/{}/season-ratings", base_url, tmdb_id);
             let response = self.client.get(&url).send().await?;
             
             if !response.status().is_success() {
                 return Ok(None);
             }
             
             let data = response.json::<Vec<IMDbRatingSeason>>().await?;
             self.set_cached(&cache_key, &data)?;
             Ok(Some(data))
    }

    async fn get_show_external_ids_impl(&self, tmdb_id: i32) -> Result<TmdbExternalIds, TmdbError> {
            let endpoint = format!("tv/{}/external_ids", tmdb_id);
            let params = vec![];

            let cache_key = self.generate_cache_key(&endpoint, &params);
            if let Some(cached) = self.get_cached::<TmdbExternalIds>(&cache_key)? {
                return Ok(cached);
            }

            let ids: TmdbExternalIds = self.fetch(&endpoint, &params).await?;
            self.set_cached(&cache_key, &ids)?;
            Ok(ids)
    }

    async fn search_movie_impl(&self, query: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
            let endpoint = "search/movie";
            let params = vec![
                ("query", query.as_str()),
                ("include_adult", "false"),
                ("language", &self.config.language),
                ("page", "1"),
            ];
            
            let cache_key = self.generate_cache_key(endpoint, &params);
            if let Some(cached) = self.get_cached::<Vec<TmdbSearchResult>>(&cache_key)? {
                return Ok(cached);
            }

            let response: SearchResponse = self.fetch(endpoint, &params).await?;
            let results = response.results;
            self.set_cached(&cache_key, &results)?;
            Ok(results)
    }

    async fn search_person_impl(&self, query: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
            let endpoint = "search/person";
            let params = vec![
                ("query", query.as_str()),
                ("include_adult", "false"),
                ("language", &self.config.language),
                ("page", "1"),
            ];
            
            let cache_key = self.generate_cache_key(endpoint, &params);
            if let Some(cached) = self.get_cached::<Vec<TmdbSearchResult>>(&cache_key)? {
                return Ok(cached);
            }

            let response: SearchResponse = self.fetch(endpoint, &params).await?;
            let mut results = response.results;
            for result in &mut results {
                result.media_type = Some("person".to_string());
            }
            self.set_cached(&cache_key, &results)?;
            Ok(results)
    }

    async fn search_multi_impl(&self, query: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
            let endpoint = "search/multi";
            let params = vec![
                ("query", query.as_str()),
                ("include_adult", "false"),
                ("language", &self.config.language),
                ("page", "1"),
            ];
            
            let cache_key = self.generate_cache_key(endpoint, &params);
            if let Some(cached) = self.get_cached::<Vec<TmdbSearchResult>>(&cache_key)? {
                return Ok(cached);
            }

            let response: SearchResponse = self.fetch(endpoint, &params).await?;
            let results = response.results;
            self.set_cached(&cache_key, &results)?;
            Ok(results)
    }

    async fn get_movie_details_impl(&self, tmdb_id: i32) -> Result<TmdbMovie, TmdbError> {
            let endpoint = format!("movie/{}", tmdb_id);
            let params = vec![
                ("language", self.config.language.as_str()),
                ("append_to_response", "credits,recommendations,similar,external_ids"),
            ];

            let cache_key = self.generate_cache_key(&endpoint, &params);
             if let Some(cached) = self.get_cached::<TmdbMovie>(&cache_key)? {
                return Ok(cached);
            }

            let movie: TmdbMovie = self.fetch(&endpoint, &params).await?;
            self.set_cached(&cache_key, &movie)?;
            Ok(movie)
    }

    async fn get_trending_impl(&self, time_window: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
            let endpoint = format!("trending/all/{}", time_window); // day or week
            let params = vec![
                ("language", self.config.language.as_str()),
            ];

            let cache_key = self.generate_cache_key(&endpoint, &params);
            if let Some(cached) = self.get_cached::<Vec<TmdbSearchResult>>(&cache_key)? {
                 return Ok(cached);
            }
            
            let response: SearchResponse = self.fetch(&endpoint, &params).await?;
            let results = response.results;
            self.set_cached(&cache_key, &results)?;
            Ok(results)
    }

    async fn get_popular_impl(&self, type_: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
            let endpoint_type = if type_ == "movie" { "movie" } else { "tv" };
            let endpoint = format!("{}/popular", endpoint_type);
            let params = vec![
                ("language", self.config.language.as_str()),
                ("page", "1"),
            ];

            let cache_key = self.generate_cache_key(&endpoint, &params);
            if let Some(cached) = self.get_cached::<Vec<TmdbSearchResult>>(&cache_key)? {
                 return Ok(cached);
            }
            
            let response: SearchResponse = self.fetch(&endpoint, &params).await?;
            let mut results = response.results;
            let type_str = if type_ == "movie" { "movie" } else { "tv" };
            for result in &mut results {
                result.media_type = Some(type_str.to_string());
            }
            self.set_cached(&cache_key, &results)?;
            Ok(results)
    }
    
    async fn get_top_rated_impl(&self, type_: String) -> Result<Vec<TmdbSearchResult>, TmdbError> {
            let endpoint_type = if type_ == "movie" { "movie" } else { "tv" };
            let endpoint = format!("{}/top_rated", endpoint_type);
            let params = vec![
                ("language", self.config.language.as_str()),
                ("page", "1"),
            ];

            let cache_key = self.generate_cache_key(&endpoint, &params);
            if let Some(cached) = self.get_cached::<Vec<TmdbSearchResult>>(&cache_key)? {
                 return Ok(cached);
            }
            
            let response: SearchResponse = self.fetch(&endpoint, &params).await?;
            let mut results = response.results;
            let type_str = if type_ == "movie" { "movie" } else { "tv" };
            for result in &mut results {
                result.media_type = Some(type_str.to_string());
            }
            self.set_cached(&cache_key, &results)?;
            Ok(results)
    }

    async fn get_recommendations_impl(&self, type_: String, tmdb_id: i32) -> Result<Vec<TmdbSearchResult>, TmdbError> {
            let endpoint_type = if type_ == "movie" { "movie" } else { "tv" };
            let endpoint = format!("{}/{}/recommendations", endpoint_type, tmdb_id);
            let params = vec![
                ("language", self.config.language.as_str()),
                ("page", "1"),
            ];

            let cache_key = self.generate_cache_key(&endpoint, &params);
            if let Some(cached) = self.get_cached::<Vec<TmdbSearchResult>>(&cache_key)? {
                 return Ok(cached);
            }
            
            let response: SearchResponse = self.fetch(&endpoint, &params).await?;
            let mut results = response.results;
            let type_str = if type_ == "movie" { "movie" } else { "tv" };
            for result in &mut results {
                result.media_type = Some(type_str.to_string());
            }
            self.set_cached(&cache_key, &results)?;
            Ok(results)
    }

    async fn get_similar_impl(&self, type_: String, tmdb_id: i32) -> Result<Vec<TmdbSearchResult>, TmdbError> {
            let endpoint_type = if type_ == "movie" { "movie" } else { "tv" };
            let endpoint = format!("{}/{}/similar", endpoint_type, tmdb_id);
            let params = vec![
                ("language", self.config.language.as_str()),
                ("page", "1"),
            ];

            let cache_key = self.generate_cache_key(&endpoint, &params);
            if let Some(cached) = self.get_cached::<Vec<TmdbSearchResult>>(&cache_key)? {
                 return Ok(cached);
            }
            
            let response: SearchResponse = self.fetch(&endpoint, &params).await?;
            let mut results = response.results;
            let type_str = if type_ == "movie" { "movie" } else { "tv" };
            for result in &mut results {
                result.media_type = Some(type_str.to_string());
            }
            self.set_cached(&cache_key, &results)?;
            Ok(results)
    }

    async fn get_all_episodes_impl(&self, tmdb_id: i32) -> Result<Vec<TmdbEpisode>, TmdbError> {
            let show = self.get_tv_show_details_impl(tmdb_id).await?;
            let mut all_episodes = Vec::new();

            // Note: Sequential fetching for simplicity, can be parallelized with futures::join_all
            for season in show.seasons {
                if season.season_number > 0 {
                    if let Ok(details) = self.get_season_details_impl(tmdb_id, season.season_number).await {
                        all_episodes.extend(details.episodes);
                    }
                }
            }
            Ok(all_episodes)
    }

    async fn get_show_image_hints_impl(&self, tmdb_id: i32) -> Result<Vec<String>, TmdbError> {
            let show = self.get_tv_show_details_impl(tmdb_id).await?;
            let mut hints = Vec::new();

            if let Some(p) = show.poster_path {
                hints.push(format!("https://image.tmdb.org/t/p/w500{}", p));
            }
            if let Some(b) = show.backdrop_path {
                hints.push(format!("https://image.tmdb.org/t/p/original{}", b));
            }

            for season in show.seasons {
                if let Some(p) = season.poster_path {
                    hints.push(format!("https://image.tmdb.org/t/p/w300{}", p));
                }
            }
            Ok(hints)
    }

    async fn fetch<T: serde::de::DeserializeOwned>(&self, endpoint: &str, params: &[(&str, &str)]) -> Result<T, TmdbError> {
        let url = format!("{}/{}", self.config.base_url, endpoint);
        
        let mut request = self.client.get(&url)
            .query(&[("api_key", &self.config.api_key)]);
            
        for (k, v) in params {
            request = request.query(&[(k, v)]);
        }

        let response = request.send().await?;
        
        if !response.status().is_success() {
            return Err(TmdbError::Network(format!("API Error: {}", response.status())));
        }
        
        let data = response.json::<T>().await?;
        Ok(data)
    }

    fn generate_cache_key(&self, endpoint: &str, params: &[(&str, &str)]) -> String {
       // Simple cache key generation
       let mut p = params.to_vec();
       p.sort_by(|a, b| a.0.cmp(b.0));
       let params_str = serde_json::to_string(&p).unwrap_or_default();
       
       let clean_endpoint = endpoint.replace(|c: char| !c.is_alphanumeric(), "_");
       // quick djb2-like hash or similar
       let mut hash: u32 = 0;
       for byte in params_str.bytes() {
           hash = hash.wrapping_add(byte as u32);
           hash = hash.wrapping_add(hash.wrapping_shl(10));
           hash = hash ^ (hash.wrapping_shr(6));
       }
       hash = hash.wrapping_add(hash.wrapping_shl(3));
       hash = hash ^ (hash.wrapping_shr(11));
       hash = hash.wrapping_add(hash.wrapping_shl(15));
       
       format!("tmdb_cache_{}_{}", clean_endpoint, hash)
    }

    fn get_cached<T: serde::de::DeserializeOwned>(&self, key: &str) -> Result<Option<T>, TmdbError> {
             if let Some(data_str) = self.storage.read_item(key.to_string())? {
                 #[derive(Deserialize)]
                 struct CacheEntry<D> {
                     data: D,
                     timestamp: i64,
                 }
                 
                 let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as i64;
                    
                 if let Ok(entry) = serde_json::from_str::<CacheEntry<T>>(&data_str) {
                     if now - entry.timestamp <= self.cache_ttl_ms {
                         return Ok(Some(entry.data));
                     } else {
                         let _ = self.storage.remove_item(key.to_string());
                     }
                 }
             }
        Ok(None)
    }
    
    fn set_cached<T: Serialize>(&self, key: &str, data: &T) -> Result<(), TmdbError> {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64;
            
            #[derive(Serialize)]
            struct CacheEntry<'a, D> {
                data: &'a D,
                timestamp: i64,
            }
            
            let entry = CacheEntry {
                data,
                timestamp: now,
            };
            
            let val_str = serde_json::to_string(&entry)?;
            self.storage.save_item(key.to_string(), val_str, now)?;
        Ok(())
    }
}


