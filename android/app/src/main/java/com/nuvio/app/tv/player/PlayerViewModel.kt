package com.nuvio.app.tv.player

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.tv.player.data.PlayerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PlayerViewModel @Inject constructor(
    val exoPlayerHolder: ExoPlayerHolder,
    private val playerRepository: PlayerRepository
) : ViewModel() {

    private var progressJob: Job? = null
    private var currentMediaId: String? = null
    private var currentTitle: String? = null
    private var currentPoster: String? = null
    
    // Intro Skip State
    private val _introTimestamps = mutableStateOf<Pair<Long, Long>?>(null)
    val showSkipButton = mutableStateOf(false)

    fun initializePlayer(url: String, mediaId: String?, title: String?, posterUrl: String?) {
        this.currentMediaId = mediaId
        this.currentTitle = title
        this.currentPoster = posterUrl
        
        // Mock fetching intro timestamps (normally from Repo)
        if (mediaId != null) {
            // Example: Intro from 10s to 30s
            _introTimestamps.value = Pair(10000L, 30000L)
        }
        startProgressTracking()
    }

    private fun startProgressTracking() {
        progressJob?.cancel()
        progressJob = viewModelScope.launch {
            while (isActive) {
                val player = exoPlayerHolder.getPlayer()
                if (player.isPlaying) {
                    val currentPos = player.currentPosition
                    val duration = player.duration
                    
                    // Update Progress
                    playerRepository.updateProgress(
                        currentMediaId,
                        currentTitle,
                        currentPoster,
                        currentPos,
                        duration
                    )
                    
                    // Check Intro
                    val intro = _introTimestamps.value
                    if (intro != null) {
                        showSkipButton.value = currentPos >= intro.first && currentPos < intro.second
                    } else {
                        showSkipButton.value = false
                    }
                }
                delay(1000) // Update check every second
            }
        }
    }

    fun skipIntro() {
        val intro = _introTimestamps.value ?: return
        exoPlayerHolder.getPlayer().seekTo(intro.second)
        showSkipButton.value = false
    }

    override fun onCleared() {
        super.onCleared()
        progressJob?.cancel()
        exoPlayerHolder.releasePlayer()
    }
}
