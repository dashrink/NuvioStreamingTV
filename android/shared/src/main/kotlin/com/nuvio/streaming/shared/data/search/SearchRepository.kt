package com.nuvio.streaming.shared.data.search

import com.nuvio.streaming.shared.di.IoDispatcher
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import uniffi.nuvio_core.SearchManager
import uniffi.nuvio_core.TraktSearchResult
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for search operations using the Trakt API.
 *
 * This repository provides search functionality for movies, shows, episodes,
 * and people using the Rust SDK's SearchManager.
 */
@Singleton
class SearchRepository @Inject constructor(
    private val searchManager: SearchManager,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher
) {

    /**
     * Search for content by text query.
     *
     * @param query The search text to match against titles and metadata
     * @param type The type of content to search for (movie, show, episode, person, list)
     * @return List of search results matching the query, or empty list on error
     */
    suspend fun search(query: String, type: String = "movie"): List<TraktSearchResult> = withContext(ioDispatcher) {
        try {
            searchManager.searchText(type, query)
        } catch (e: Exception) {
            // Log error in production
            emptyList()
        }
    }

    /**
     * Search for content by IMDb ID.
     *
     * @param imdbId The IMDb ID (e.g., "tt0133093" for The Matrix)
     * @param type Optional type filter (movie, show, episode). If empty, searches all types.
     * @return List of matching items (typically 0 or 1), or empty list on error
     */
    suspend fun searchByImdb(imdbId: String, type: String = ""): List<TraktSearchResult> = withContext(ioDispatcher) {
        try {
            searchManager.searchByImdb(imdbId, type)
        } catch (e: Exception) {
            // Log error in production
            emptyList()
        }
    }

    /**
     * Search for content by TMDB ID.
     *
     * @param tmdbId The TMDB ID (positive integer)
     * @param type Type of content (movie or show)
     * @return List of matching items (typically 0 or 1), or empty list on error
     */
    suspend fun searchByTmdb(tmdbId: Long, type: String): List<TraktSearchResult> = withContext(ioDispatcher) {
        try {
            searchManager.searchByTmdb(tmdbId, type)
        } catch (e: Exception) {
            // Log error in production
            emptyList()
        }
    }
}
