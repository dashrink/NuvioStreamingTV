package com.nuvio.app.tv.player

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.tv.player.data.PlayerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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

    // Player Controls State
    private val _controlsState = MutableStateFlow(PlayerControlsState())
    val controlsState: StateFlow<PlayerControlsState> = _controlsState.asStateFlow()

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

        // Initialize tracks after media is loaded
        viewModelScope.launch {
            delay(1000) // Wait for media to load
            refreshAvailableTracks()
        }
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

    fun refreshAvailableTracks() {
        val audioTracks = exoPlayerHolder.getAvailableAudioTracks()
        val subtitles = exoPlayerHolder.getAvailableSubtitles()
        val qualities = exoPlayerHolder.getAvailableQualities()

        _controlsState.value = _controlsState.value.copy(
            availableAudioTracks = audioTracks,
            availableSubtitles = subtitles,
            selectedAudioTrackId = audioTracks.find { it.isSelected }?.id,
            selectedSubtitleTrackId = subtitles.find { it.isSelected }?.id ?: "off",
            availableQualities = qualities
        )
    }

    fun selectAudioTrack(trackId: String) {
        exoPlayerHolder.selectAudioTrack(trackId)
        _controlsState.value = _controlsState.value.copy(selectedAudioTrackId = trackId)
    }

    fun selectSubtitleTrack(trackId: String) {
        exoPlayerHolder.selectSubtitleTrack(trackId)
        _controlsState.value = _controlsState.value.copy(selectedSubtitleTrackId = trackId)
    }

    fun setPlaybackSpeed(speed: Float) {
        exoPlayerHolder.setPlaybackSpeed(speed)
        _controlsState.value = _controlsState.value.copy(playbackSpeed = speed)
    }

    fun updateSubtitleSettings(settings: SubtitleSettings) {
        _controlsState.value = _controlsState.value.copy(subtitleSettings = settings)
    }

    fun selectQuality(quality: QualityOption) {
        exoPlayerHolder.selectQuality(quality)
        _controlsState.value = _controlsState.value.copy(selectedQuality = quality)
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
