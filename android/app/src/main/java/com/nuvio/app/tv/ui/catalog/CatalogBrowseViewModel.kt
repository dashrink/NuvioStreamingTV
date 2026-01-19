package com.nuvio.app.tv.ui.catalog

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.tv.data.repository.CatalogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CatalogBrowseViewModel @Inject constructor(
    private val repository: CatalogRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CatalogBrowseUiState())
    val uiState: StateFlow<CatalogBrowseUiState> = _uiState.asStateFlow()

    init {
        loadGenres()
        loadCatalog()
    }

    private fun loadGenres() {
        viewModelScope.launch {
            repository.getGenres(_uiState.value.filterState.contentType)
                .onSuccess { genres ->
                    _uiState.update { it.copy(availableGenres = genres) }
                }
                .onFailure { error ->
                    // Silently fail for genres, not critical
                    error.printStackTrace()
                }
        }
    }

    fun loadCatalog(resetPage: Boolean = true) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = resetPage,
                    error = null,
                    items = if (resetPage) emptyList() else it.items,
                    currentPage = if (resetPage) 1 else it.currentPage
                )
            }

            val state = _uiState.value
            val result = repository.browseCatalog(
                contentType = state.filterState.contentType,
                catalogId = state.filterState.sort.catalogId,
                page = state.currentPage,
                genre = state.filterState.genre,
                year = state.filterState.year
            )

            result.onSuccess { page ->
                _uiState.update { currentState ->
                    currentState.copy(
                        isLoading = false,
                        items = if (resetPage) page.items else currentState.items + page.items,
                        hasMore = page.hasMore,
                        currentPage = page.page
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to load catalog"
                    )
                }
            }
        }
    }

    fun loadMore() {
        if (_uiState.value.isLoadingMore || !_uiState.value.hasMore) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMore = true) }

            val state = _uiState.value
            val result = repository.browseCatalog(
                contentType = state.filterState.contentType,
                catalogId = state.filterState.sort.catalogId,
                page = state.currentPage + 1,
                genre = state.filterState.genre,
                year = state.filterState.year
            )

            result.onSuccess { page ->
                _uiState.update { currentState ->
                    currentState.copy(
                        isLoadingMore = false,
                        items = currentState.items + page.items,
                        hasMore = page.hasMore,
                        currentPage = page.page
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoadingMore = false,
                        error = error.message ?: "Failed to load more"
                    )
                }
            }
        }
    }

    fun setContentType(contentType: String) {
        if (_uiState.value.filterState.contentType == contentType) return

        _uiState.update {
            it.copy(
                filterState = it.filterState.copy(
                    contentType = contentType,
                    genre = null // Reset genre when changing content type
                )
            )
        }
        loadGenres()
        loadCatalog()
    }

    fun setGenre(genre: String?) {
        if (_uiState.value.filterState.genre == genre) return

        _uiState.update {
            it.copy(filterState = it.filterState.copy(genre = genre))
        }
        loadCatalog()
    }

    fun setYear(year: Int?) {
        if (_uiState.value.filterState.year == year) return

        _uiState.update {
            it.copy(filterState = it.filterState.copy(year = year))
        }
        loadCatalog()
    }

    fun setSort(sort: SortOption) {
        if (_uiState.value.filterState.sort == sort) return

        _uiState.update {
            it.copy(filterState = it.filterState.copy(sort = sort))
        }
        loadCatalog()
    }

    fun clearFilters() {
        _uiState.update {
            it.copy(
                filterState = FilterState(contentType = it.filterState.contentType)
            )
        }
        loadCatalog()
    }

    fun retry() {
        loadCatalog()
    }
}
