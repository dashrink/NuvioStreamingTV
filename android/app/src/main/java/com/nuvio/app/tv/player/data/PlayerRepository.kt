package com.nuvio.app.tv.player.data

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Singleton
class PlayerRepository @Inject constructor() {
    
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
             
             // TODO: Real integration with generated bindings
             // val item = WatchedItem(
             //    id = mediaId,
             //    title = title ?: "",
             //    poster = poster ?: "",
             //    progress = progress,
             //    duration = duration.toDouble(),
             //    lastWatchedAt = System.currentTimeMillis() / 1000
             // )
             // profileManager.updateWatchedItem(activeProfileId, item)
             
            println("Updating progress for $mediaId: $progress")
        }
    }
}
