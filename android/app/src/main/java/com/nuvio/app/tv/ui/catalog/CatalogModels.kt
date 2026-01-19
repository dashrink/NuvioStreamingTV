package com.nuvio.app.tv.ui.catalog

import com.nuvio.app.tv.data.repository.Meta

/**
 * Filter state for catalog browsing
 */
data class FilterState(
    val contentType: String = "movie",
    val genre: String? = null,
    val year: Int? = null,
    val sort: SortOption = SortOption.TRENDING
)

/**
 * Sort options for catalog
 */
enum class SortOption(val displayName: String, val catalogId: String) {
    TRENDING("Trending", "top"),
    POPULAR("Popular", "popular"),
    NEWEST("Newest", "newest"),
    RATING("Top Rated", "rating")
}

/**
 * UI state for catalog browse screen
 */
data class CatalogBrowseUiState(
    val isLoading: Boolean = false,
    val items: List<Meta> = emptyList(),
    val currentPage: Int = 1,
    val hasMore: Boolean = true,
    val filterState: FilterState = FilterState(),
    val availableGenres: List<String> = emptyList(),
    val error: String? = null,
    val isLoadingMore: Boolean = false
)
