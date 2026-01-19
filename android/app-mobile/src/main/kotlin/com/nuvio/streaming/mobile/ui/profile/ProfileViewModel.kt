package com.nuvio.streaming.mobile.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.streaming.shared.data.profile.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import uniffi.nuvio_core.Profile
import uniffi.nuvio_core.ProfileType
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfiles()
    }

    fun loadProfiles() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val profiles = profileRepository.getProfiles()
                _uiState.update { it.copy(profiles = profiles, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun addProfile(name: String, type: ProfileType, pin: String? = null) {
        viewModelScope.launch {
            try {
                profileRepository.createProfile(name, type, pin)
                loadProfiles()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun switchProfile(id: String) {
        viewModelScope.launch {
            try {
                profileRepository.switchProfile(id)
                // In a real app, this would trigger navigation or state change
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
    
    fun verifyPin(id: String, pin: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
             try {
                 if (profileRepository.verifyPin(id, pin)) {
                     onSuccess()
                 } else {
                     _uiState.update { it.copy(error = "Invalid PIN") }
                 }
             } catch (e: Exception) {
                 _uiState.update { it.copy(error = e.message) }
             }
        }
    }
    
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}

data class ProfileUiState(
    val profiles: List<Profile> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)
