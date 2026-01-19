package com.nuvio.streaming.shared.data.profile

import com.nuvio.streaming.shared.di.IoDispatcher
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import uniffi.nuvio_core.CreateProfileInput
import uniffi.nuvio_core.Profile
import uniffi.nuvio_core.ProfileManager
import uniffi.nuvio_core.ProfileType
import uniffi.nuvio_core.UpdateProfileInput
import uniffi.nuvio_core.WatchedItem
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileRepository @Inject constructor(
    private val profileManager: ProfileManager,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher
) {

    suspend fun getProfiles(): List<Profile> = withContext(ioDispatcher) {
        profileManager.getProfiles()
    }

    suspend fun createProfile(
        name: String,
        type: ProfileType,
        pin: String? = null,
        avatarId: String? = null
    ): Profile = withContext(ioDispatcher) {
        profileManager.createProfile(
            CreateProfileInput(
                name = name,
                profileType = type,
                pin = pin,
                avatarId = avatarId,
                maxAgeRating = null
            )
        )
    }

    suspend fun updateProfile(
        id: String,
        name: String? = null,
        avatarId: String? = null
    ): Profile = withContext(ioDispatcher) {
        profileManager.updateProfile(
            id,
            UpdateProfileInput(
                name = name,
                avatarId = avatarId,
                maxAgeRating = null,
                preferences = null
            )
        )
    }

    suspend fun deleteProfile(id: String) = withContext(ioDispatcher) {
        profileManager.deleteProfile(id)
    }

    suspend fun switchProfile(id: String) = withContext(ioDispatcher) {
        profileManager.switchProfile(id)
    }

    suspend fun getActiveProfile(): Profile? = withContext(ioDispatcher) {
        profileManager.getActiveProfile()
    }

    suspend fun verifyPin(id: String, pin: String): Boolean = withContext(ioDispatcher) {
        profileManager.verifyPin(id, pin)
    }
    
    suspend fun setPin(id: String, pin: String) = withContext(ioDispatcher) {
        profileManager.setPin(id, pin)
    }

    suspend fun getWatchedHistory(profileId: String): List<WatchedItem> = withContext(ioDispatcher) {
        profileManager.getWatchedHistory(profileId)
    }
}
