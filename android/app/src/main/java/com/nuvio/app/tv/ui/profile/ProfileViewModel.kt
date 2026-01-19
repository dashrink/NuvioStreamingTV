package com.nuvio.app.tv.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.tv.data.repository.ProfileRepository
import com.nuvio.sdk.core.CreateProfileInput
import com.nuvio.sdk.core.Profile
import com.nuvio.sdk.core.UpdateProfileInput
import com.nuvio.sdk.core.WatchedItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val isLoading: Boolean = false,
    val profiles: List<Profile> = emptyList(),
    val activeProfile: Profile? = null,
    val watchHistory: List<WatchedItem> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val repository: ProfileRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfiles()
        loadActiveProfile()
    }

    fun loadProfiles() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.getProfiles().fold(
                onSuccess = { profiles ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        profiles = profiles
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message
                    )
                }
            )
        }
    }

    fun loadActiveProfile() {
        viewModelScope.launch {
            repository.getActiveProfile().fold(
                onSuccess = { profile ->
                    _uiState.value = _uiState.value.copy(activeProfile = profile)
                    profile?.let { loadWatchHistory(it.id) }
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(error = error.message)
                }
            )
        }
    }

    fun loadWatchHistory(profileId: String) {
        viewModelScope.launch {
            repository.getWatchedHistory(profileId).fold(
                onSuccess = { history ->
                    _uiState.value = _uiState.value.copy(watchHistory = history)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(error = error.message)
                }
            )
        }
    }

    fun createProfile(input: CreateProfileInput) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.createProfile(input).fold(
                onSuccess = { profile ->
                    _uiState.value = _uiState.value.copy(isLoading = false)
                    loadProfiles()
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message
                    )
                }
            )
        }
    }

    fun switchProfile(profileId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.switchProfile(profileId).fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isLoading = false)
                    loadActiveProfile()
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message
                    )
                }
            )
        }
    }

    fun updateProfile(profileId: String, input: UpdateProfileInput) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.updateProfile(profileId, input).fold(
                onSuccess = { profile ->
                    _uiState.value = _uiState.value.copy(isLoading = false)
                    loadProfiles()
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message
                    )
                }
            )
        }
    }

    fun deleteProfile(profileId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.deleteProfile(profileId).fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isLoading = false)
                    loadProfiles()
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message
                    )
                }
            )
        }
    }

    fun verifyPin(profileId: String, pin: String, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            repository.verifyPin(profileId, pin).fold(
                onSuccess = { isValid ->
                    onResult(isValid)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(error = error.message)
                    onResult(false)
                }
            )
        }
    }

    fun exportProfiles(onResult: (String?) -> Unit) {
        viewModelScope.launch {
            repository.exportProfiles().fold(
                onSuccess = { json ->
                    onResult(json)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(error = error.message)
                    onResult(null)
                }
            )
        }
    }

    fun importProfiles(json: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.importProfiles(json).fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isLoading = false)
                    loadProfiles()
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message
                    )
                }
            )
        }
    }
}
