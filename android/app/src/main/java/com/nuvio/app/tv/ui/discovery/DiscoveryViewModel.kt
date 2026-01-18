package com.nuvio.app.tv.ui.discovery

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.tv.data.repository.CatalogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.nuvio.app.tv.data.repository.Meta
import javax.inject.Inject

data class DiscoveryUiState(
    val query: String = "",
    val results: List<Meta> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class DiscoveryViewModel @Inject constructor(
    private val repository: CatalogRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DiscoveryUiState())
    val uiState: StateFlow<DiscoveryUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    fun onQueryChange(query: String) {
        _uiState.value = _uiState.value.copy(query = query)
        
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(500) // Debounce
            if (query.length > 2) {
                performSearch(query)
            } else if (query.isEmpty()) {
                _uiState.value = _uiState.value.copy(results = emptyList())
            }
        }
    }

    private suspend fun performSearch(query: String) {
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
        repository.search(query).fold(
            onSuccess = { results ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    results = results
                )
            },
            onFailure = { error ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = error.localizedMessage ?: "Search failed"
                )
            }
        )
    }
}
