package com.nuvio.streaming.mobile.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.streaming.shared.data.search.SearchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uniffi.nuvio_core.TraktSearchResult
import javax.inject.Inject

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val searchRepository: SearchRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    fun onQueryChanged(query: String) {
        _uiState.update { it.copy(query = query) }
        if (query.length > 2) {
            search(query)
        } else if (query.isEmpty()) {
             _uiState.update { it.copy(results = emptyList()) }
        }
    }
    
    fun onTypeSelected(type: String) {
        _uiState.update { it.copy(selectedType = type) }
        val query = _uiState.value.query
        if (query.length > 2) {
            search(query)
        }
    }

    private fun search(query: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val results = searchRepository.search(query, _uiState.value.selectedType)
                _uiState.update { it.copy(results = results, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
}

data class SearchUiState(
    val query: String = "",
    val selectedType: String = "movie",
    val results: List<TraktSearchResult> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)
