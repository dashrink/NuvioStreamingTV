package com.nuvio.app.tv.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.tv.data.repository.CatalogRepository
import com.nuvio.app.tv.data.repository.Meta
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchUiState(
    val query: String = "",
    val results: List<Meta> = emptyList(),
    val recentSearches: List<String> = emptyList(),
    val selectedType: String? = null,
    val selectedGenre: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val catalogRepository: CatalogRepository,
    private val searchHistoryManager: SearchHistoryManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null
    private val debounceTime = 500L

    init {
        loadRecentSearches()
    }

    private fun loadRecentSearches() {
        viewModelScope.launch {
            val searches = searchHistoryManager.getRecentSearches()
            _uiState.update { it.copy(recentSearches = searches) }
        }
    }

    fun onQueryChange(query: String) {
        _uiState.update { it.copy(query = query, error = null) }

        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(debounceTime)
            if (query.length >= 2) {
                performSearch()
            } else if (query.isEmpty()) {
                _uiState.update { it.copy(results = emptyList()) }
            }
        }
    }

    fun onTypeChange(type: String?) {
        _uiState.update { it.copy(selectedType = type) }
        if (_uiState.value.query.length >= 2) {
            searchJob?.cancel()
            searchJob = viewModelScope.launch {
                performSearch()
            }
        }
    }

    fun onGenreChange(genre: String?) {
        _uiState.update { it.copy(selectedGenre = genre) }
        if (_uiState.value.query.length >= 2) {
            searchJob?.cancel()
            searchJob = viewModelScope.launch {
                performSearch()
            }
        }
    }

    private suspend fun performSearch() {
        val query = _uiState.value.query
        if (query.length < 2) return

        _uiState.update { it.copy(isLoading = true, error = null) }

        catalogRepository.search(query).fold(
            onSuccess = { results ->
                // Apply filters
                val filteredResults = applyFilters(results)

                // Save to search history
                searchHistoryManager.addSearch(query)

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        results = filteredResults,
                        recentSearches = searchHistoryManager.getRecentSearches()
                    )
                }
            },
            onFailure = { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = error.localizedMessage ?: "Search failed"
                    )
                }
            }
        )
    }

    private fun applyFilters(results: List<Meta>): List<Meta> {
        var filtered = results

        // Filter by type
        _uiState.value.selectedType?.let { type ->
            filtered = filtered.filter { meta ->
                when (type) {
                    "movie" -> meta.type?.lowercase()?.contains("movie") == true
                    "series" -> meta.type?.lowercase()?.contains("series") == true ||
                                meta.type?.lowercase()?.contains("show") == true
                    else -> true
                }
            }
        }

        // Filter by genre
        _uiState.value.selectedGenre?.let { genre ->
            filtered = filtered.filter { meta ->
                meta.genres?.any { it.lowercase().contains(genre.lowercase()) } == true
            }
        }

        return filtered
    }

    fun retry() {
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            performSearch()
        }
    }

    fun clearSearchHistory() {
        viewModelScope.launch {
            searchHistoryManager.clearHistory()
            _uiState.update { it.copy(recentSearches = emptyList()) }
        }
    }
}

/**
 * Manages search history persistence
 */
class SearchHistoryManager @Inject constructor() {
    private val maxHistorySize = 10
    private val searchHistory = mutableListOf<String>()

    fun getRecentSearches(): List<String> = searchHistory.toList()

    fun addSearch(query: String) {
        // Remove if exists and add to front
        searchHistory.remove(query)
        searchHistory.add(0, query)

        // Keep only last N items
        while (searchHistory.size > maxHistorySize) {
            searchHistory.removeLast()
        }
    }

    fun clearHistory() {
        searchHistory.clear()
    }
}
