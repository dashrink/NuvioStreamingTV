package com.nuvio.app.tv.player.data

import com.nuvio.app.tv.data.repository.ProfileRepository
import com.nuvio.sdk.core.WatchedItem
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Singleton
class PlayerRepository @Inject constructor(
    private val profileRepository: ProfileRepository
) {

    suspend fun updateProgress(
        mediaId: String?,
        title: String?,
        poster: String?,
        position: Long,
        duration: Long
    ) {
        if (mediaId == null || duration <= 0) return

        withContext(Dispatchers.IO) {
            val progress = position.toDouble() / duration.toDouble()

            // Get the active profile to update watch history
            val activeProfile = profileRepository.getActiveProfile().getOrNull()

            if (activeProfile != null) {
                val item = WatchedItem(
                    id = mediaId,
                    title = title ?: "",
                    poster = poster ?: "",
                    progress = progress,
                    duration = duration.toDouble(),
                    lastWatchedAt = System.currentTimeMillis() / 1000
                )

                profileRepository.updateWatchedItem(activeProfile.id, item)
                    .onSuccess {
                        println("Successfully updated watch progress for $mediaId: $progress")
                    }
                    .onFailure { e ->
                        println("Failed to update watch progress: ${e.message}")
                    }
            } else {
                println("No active profile found, skipping progress update")
            }
        }
    }
}
