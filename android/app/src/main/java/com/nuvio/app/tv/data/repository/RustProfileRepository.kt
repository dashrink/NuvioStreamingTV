package com.nuvio.app.tv.data.repository

import com.nuvio.sdk.core.CreateProfileInput
import com.nuvio.sdk.core.NuvioException
import com.nuvio.sdk.core.Profile
import com.nuvio.sdk.core.ProfileManager
import com.nuvio.sdk.core.UpdateProfileInput
import com.nuvio.sdk.core.WatchedItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Rust SDK implementation of ProfileRepository using ProfileManager.
 * All operations run on IO dispatcher for thread safety.
 */
@Singleton
class RustProfileRepository @Inject constructor(
    private val profileManager: ProfileManager
) : ProfileRepository {

    override suspend fun createProfile(input: CreateProfileInput): Result<Profile> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.createProfile(input)
            }.mapError()
        }

    override suspend fun deleteProfile(id: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.deleteProfile(id)
            }.mapError()
        }

    override suspend fun getActiveProfile(): Result<Profile?> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.getActiveProfile()
            }.mapError()
        }

    override suspend fun getProfiles(): Result<List<Profile>> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.getProfiles()
            }.mapError()
        }

    override suspend fun getWatchedHistory(profileId: String): Result<List<WatchedItem>> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.getWatchedHistory(profileId)
            }.mapError()
        }

    override suspend fun switchProfile(id: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.switchProfile(id)
            }.mapError()
        }

    override suspend fun updateProfile(id: String, input: UpdateProfileInput): Result<Profile> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.updateProfile(id, input)
            }.mapError()
        }

    override suspend fun updateWatchedItem(profileId: String, item: WatchedItem): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.updateWatchedItem(profileId, item)
            }.mapError()
        }

    override suspend fun setPin(id: String, pin: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.setPin(id, pin)
            }.mapError()
        }

    override suspend fun verifyPin(id: String, pin: String): Result<Boolean> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.verifyPin(id, pin)
            }.mapError()
        }

    override suspend fun exportProfiles(): Result<String> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.exportProfiles()
            }.mapError()
        }

    override suspend fun importProfiles(json: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                profileManager.importProfiles(json)
            }.mapError()
        }

    /**
     * Maps NuvioException to more descriptive error messages.
     */
    private fun <T> Result<T>.mapError(): Result<T> = this.recoverCatching {
        when (it) {
            is NuvioException.ProfileException ->
                throw Exception("Profile error: ${it.toString()}")
            is NuvioException.StorageException ->
                throw Exception("Storage error: ${it.toString()}")
            is NuvioException.ValidationException ->
                throw Exception("Validation error: ${it.toString()}")
            is NuvioException.SecurityException ->
                throw Exception("Security error: ${it.toString()}")
            is NuvioException.NetworkException ->
                throw Exception("Network error: ${it.toString()}")
            else ->
                throw Exception("Profile operation failed: ${it.message}")
        }
    }
}
