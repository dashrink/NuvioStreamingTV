package com.nuvio.app.tv.data.repository

import uniffi.nuvio_core.CreateProfileInput
import uniffi.nuvio_core.Profile
import uniffi.nuvio_core.UpdateProfileInput
import uniffi.nuvio_core.WatchedItem

/**
 * Repository interface for profile management operations.
 * Provides access to user profiles, watch history, and profile preferences.
 */
interface ProfileRepository {
    /**
     * Creates a new profile with the given input.
     * @param input Profile creation parameters
     * @return Result containing the created Profile or error
     */
    suspend fun createProfile(input: CreateProfileInput): Result<Profile>

    /**
     * Deletes a profile by ID.
     * @param id Profile ID to delete
     * @return Result indicating success or error
     */
    suspend fun deleteProfile(id: String): Result<Unit>

    /**
     * Gets the currently active profile.
     * @return Result containing the active Profile or null if none active
     */
    suspend fun getActiveProfile(): Result<Profile?>

    /**
     * Gets all profiles.
     * @return Result containing list of all Profiles
     */
    suspend fun getProfiles(): Result<List<Profile>>

    /**
     * Gets watch history for a specific profile.
     * @param profileId Profile ID to get history for
     * @return Result containing list of WatchedItems
     */
    suspend fun getWatchedHistory(profileId: String): Result<List<WatchedItem>>

    /**
     * Switches to a different profile.
     * @param id Profile ID to switch to
     * @return Result indicating success or error
     */
    suspend fun switchProfile(id: String): Result<Unit>

    /**
     * Updates a profile with new information.
     * @param id Profile ID to update
     * @param input Profile update parameters
     * @return Result containing the updated Profile or error
     */
    suspend fun updateProfile(id: String, input: UpdateProfileInput): Result<Profile>

    /**
     * Updates or adds a watched item to profile's watch history.
     * @param profileId Profile ID to update
     * @param item WatchedItem to add/update
     * @return Result indicating success or error
     */
    suspend fun updateWatchedItem(profileId: String, item: WatchedItem): Result<Unit>

    /**
     * Sets a PIN for a profile.
     * @param id Profile ID
     * @param pin PIN to set
     * @return Result indicating success or error
     */
    suspend fun setPin(id: String, pin: String): Result<Unit>

    /**
     * Verifies a PIN for a profile.
     * @param id Profile ID
     * @param pin PIN to verify
     * @return Result containing true if PIN is correct, false otherwise
     */
    suspend fun verifyPin(id: String, pin: String): Result<Boolean>

    /**
     * Exports all profiles to JSON string.
     * @return Result containing JSON string representation of all profiles
     */
    suspend fun exportProfiles(): Result<String>

    /**
     * Imports profiles from JSON string.
     * @param json JSON string containing profiles data
     * @return Result indicating success or error
     */
    suspend fun importProfiles(json: String): Result<Unit>
}
